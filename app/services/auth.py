import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("homesync.auth")

from sqlalchemy import select
from app.models.society import Society, SocietySettings
from app.models.wing import Wing
from app.models.floor import Floor
from app.models.flat import Flat
from app.core.config import settings
from app.core.constants import RoleEnum, TokenType
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    hash_token,
    verify_token,
)
from app.models.user import User
from app.models.session import Session
from app.models.device import Device
from app.models.password_reset import PasswordReset
from app.repositories.user import UserRepository
from app.repositories.role import RoleRepository
from app.repositories.session import SessionRepository
from app.repositories.device import DeviceRepository
from app.repositories.otp import OTPRepository
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    UserUpdateRequest,
    ChangePasswordRequest,
)
from app.exceptions.custom import (
    AuthenticationError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.utils.security import generate_random_token
from app.utils.email import send_password_reset_email

user_repo = UserRepository()
role_repo = RoleRepository()
session_repo = SessionRepository()
device_repo = DeviceRepository()


class AuthService:
    @staticmethod
    async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
        """
        Create a new user with standard role 'Resident'.
        """
        # Check if email exists
        existing_email = await user_repo.get_by_email(db, data.email)
        if existing_email:
            raise ConflictError(detail="Email is already registered.", error_code="EMAIL_IN_USE")

        # Check if phone exists
        if data.phone:
            existing_phone = await user_repo.get_by_phone(db, data.phone)
            if existing_phone:
                raise ConflictError(detail="Phone number is already registered.", error_code="PHONE_IN_USE")

        # Get Resident role (default)
        role = await role_repo.get_by_name(db, RoleEnum.RESIDENT.value)
        if not role:
            raise NotFoundError(detail="Default Role 'Resident' not found in database.", error_code="ROLE_NOT_FOUND")

        from app.utils.supabase_auth import SupabaseAuthClient

        # Sign up in Supabase (only email or phone can be provided to Supabase signup at once, so we pass email and store the phone number in our local database)
        try:
            supabase_user = await SupabaseAuthClient.signup_user(email=data.email, password=data.password, phone=None)
        except Exception as e:
            err_msg = str(e).lower()
            if "already registered" in err_msg or "already_registered" in err_msg:
                # User already exists in Supabase but not in our local DB.
                # Let's verify the user's password by attempting to log them in via Supabase.
                try:
                    supabase_user = await SupabaseAuthClient.login_user(data.email, data.password, db)
                except Exception:
                    # If login fails (wrong password or other authentication error), raise the standard conflict error
                    raise ConflictError(detail="Email is already registered.", error_code="EMAIL_IN_USE")
            else:
                raise e
        
        # Extract user ID (handles both real nested 'user' key and mock flat dict)
        user_id_str = supabase_user.get("id") or supabase_user.get("user", {}).get("id")
        if not user_id_str:
            raise ValidationError(detail="Failed to retrieve user ID from Supabase signup response.")
        supabase_uid = uuid.UUID(user_id_str)

        # Detect if user was auto-confirmed on signup (e.g. if "Confirm email" is disabled in Supabase)
        user_obj = supabase_user.get("user", {}) if "user" in supabase_user else supabase_user
        is_verified = user_obj.get("email_confirmed_at") is not None

        new_user = User(
            id=supabase_uid,
            email=data.email,
            phone=data.phone,
            hashed_password="SUPABASE_AUTH",
            full_name=data.full_name,
            role_id=role.id,
            society_id=data.society_id,
            is_active=True,
            is_verified=is_verified,
        )
        user = await user_repo.create(db, obj_in=new_user)
        await db.flush()

        # Custom OTP generation and sending for email confirmation
        if not is_verified:
            from app.services.otp import OTPService
            try:
                await OTPService.generate_and_send_otp(db, data.email, "register")
                logger.info(f"[Registration] Custom OTP email sent successfully to {data.email}")
            except Exception as otp_err:
                logger.error(f"[Registration Rollback] Failed to send registration OTP email to {data.email}: {str(otp_err)}")
                
                # Delete user from Supabase Auth to keep state synchronized
                try:
                    await SupabaseAuthClient.admin_delete_user(str(supabase_uid))
                    logger.info(f"[Registration Rollback] Deleted user {supabase_uid} from Supabase Auth.")
                except Exception as del_err:
                    logger.error(f"[Registration Rollback Error] Failed to delete user {supabase_uid} from Supabase Auth: {str(del_err)}")
                
                # Propagate the SMTP exception to abort local database transaction
                raise otp_err

        return user

    @staticmethod
    async def login_user(db: AsyncSession, data: LoginRequest, ip_address: Optional[str], user_agent: Optional[str]) -> Dict[str, Any]:
        """
        Authenticate user, register/bind devices, and return JWT credentials.
        """
        from app.utils.supabase_auth import SupabaseAuthClient, is_supabase_mock

        if is_supabase_mock():
            return await SupabaseAuthClient.login_user(data.email, data.password, db)

        # Authenticate via Supabase GoTrue
        supabase_session = await SupabaseAuthClient.login_user(data.email, data.password, db)
        access_token = supabase_session["access_token"]
        refresh_token = supabase_session["refresh_token"]
        supabase_user = supabase_session["user"]
        supabase_uid = uuid.UUID(supabase_user["id"])

        user = await user_repo.get(db, supabase_uid)
        if not user:
            user = await user_repo.get_by_email(db, data.email)
            if not user:
                raise AuthenticationError(detail="Invalid email or password.")

        if not user.is_active:
            raise ForbiddenError(detail="User account is deactivated.")

        # Sync verification state dynamically
        is_verified = "email_confirmed_at" in supabase_user and supabase_user["email_confirmed_at"] is not None
        if is_verified and not user.is_verified:
            user.is_verified = True
            db.add(user)
            await db.flush()

        if not user.is_verified:
            raise ForbiddenError(
                detail="Email address is not verified. Please verify your email first.",
                error_code="EMAIL_NOT_VERIFIED"
            )

        # Register or retrieve device binding
        device_obj = None
        if data.push_token or data.device_model:
            if data.push_token:
                device_obj = await device_repo.get_by_user_and_token(db, user.id, data.push_token)
            
            if not device_obj:
                device_obj = Device(
                    user_id=user.id,
                    push_token=data.push_token,
                    device_type=data.device_type,
                    os_version=data.os_version,
                    device_model=data.device_model,
                    is_active=True
                )
                await device_repo.create(db, obj_in=device_obj)
                await db.flush()

        session_id = uuid.uuid4()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "session_id": session_id,
            "user": user,
        }

    @staticmethod
    async def create_session_for_user(
        db: AsyncSession,
        user: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates session fallback for mock / testing.
        """
        session_id = uuid.uuid4()
        temp_refresh_token = create_refresh_token(
            user_id=str(user.id),
            session_id=str(session_id),
            token_version=1
        )
        
        user_permissions = [p.name for p in user.role.permissions] if user.role else []
        access_token = create_access_token(
            user_id=str(user.id),
            society_id=str(user.society_id) if user.society_id else None,
            role=user.role.name if user.role else "Resident",
            permissions=user_permissions,
            session_id=str(session_id),
        )

        return {
            "access_token": access_token,
            "refresh_token": temp_refresh_token,
            "session_id": session_id,
            "user": user,
        }

    @staticmethod
    async def refresh_access_token(db: AsyncSession, refresh_token: str) -> Dict[str, str]:
        """
        Validate refresh token and rotate tokens.
        """
        from app.utils.supabase_auth import SupabaseAuthClient
        
        result = await SupabaseAuthClient.refresh_token(refresh_token)
        return {
            "access_token": result["access_token"],
            "refresh_token": result["refresh_token"],
        }

    @staticmethod
    async def logout_session(db: AsyncSession, refresh_token: str, token: Optional[str] = None) -> None:
        """
        Logout current session.
        """
        from app.utils.supabase_auth import SupabaseAuthClient, is_supabase_mock

        if is_supabase_mock():
            return

        if not token:
            try:
                refreshed = await SupabaseAuthClient.refresh_token(refresh_token)
                token = refreshed.get("access_token")
            except Exception:
                pass

        if token:
            await SupabaseAuthClient.logout(token, scope="local")

    @staticmethod
    async def logout_all_sessions(db: AsyncSession, user_id: uuid.UUID, token: Optional[str] = None) -> None:
        """
        Revoke all active sessions for a user globally.
        """
        from app.utils.supabase_auth import SupabaseAuthClient, is_supabase_mock

        if is_supabase_mock():
            return

        if token:
            await SupabaseAuthClient.logout(token, scope="global")

    @staticmethod
    async def change_password(db: AsyncSession, user: User, data: ChangePasswordRequest, token: Optional[str] = None) -> None:
        """
        Change user password. Requires verification of the current password.
        """
        from app.utils.supabase_auth import SupabaseAuthClient, is_supabase_mock

        if is_supabase_mock():
            if not verify_password(data.current_password, user.hashed_password):
                raise ValidationError(detail="Current password is incorrect.", error_code="INVALID_CURRENT_PASSWORD")
            user.hashed_password = get_password_hash(data.new_password)
            db.add(user)
            await db.flush()
            return

        if token:
            await SupabaseAuthClient.update_user(token, {"password": data.new_password})
            user.login_attempts = 0
            user.locked_until = None
            db.add(user)
            await db.flush()

    @staticmethod
    async def request_password_reset(db: AsyncSession, email: str) -> None:
        """
        Generate and send password reset request.
        """
        user = await user_repo.get_by_email(db, email)
        if not user:
            return

        from app.utils.supabase_auth import SupabaseAuthClient, is_supabase_mock

        if is_supabase_mock():
            from app.services.otp import OTPService
            from app.core.constants import OtpPurpose
            await OTPService.generate_and_send_otp(db, email, OtpPurpose.RESET.value)
            return

        await SupabaseAuthClient.recover(email)

    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
        """
        Reset user password.
        """
        from app.utils.supabase_auth import SupabaseAuthClient, is_supabase_mock

        if is_supabase_mock():
            token_hash = hash_token(token)
            query = select(PasswordReset).where(
                PasswordReset.token_hash == token_hash,
                PasswordReset.is_used == False,
                PasswordReset.expires_at > datetime.now(timezone.utc)
            )
            result = await db.execute(query)
            reset_record = result.scalar_one_or_none()

            if not reset_record:
                raise ValidationError(detail="Password reset token is invalid or has expired.", error_code="INVALID_RESET_TOKEN")

            user = reset_record.user
            user.hashed_password = get_password_hash(new_password)
            user.login_attempts = 0
            user.locked_until = None
            db.add(user)

            reset_record.is_used = True
            db.add(reset_record)
            await db.flush()
            return

        # token is the access_token in production
        await SupabaseAuthClient.update_user(token, {"password": new_password})


