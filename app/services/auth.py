from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

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
            # Fallback check - if roles table is not populated, grab or raise
            raise NotFoundError(detail="Default Role 'Resident' not found in database.", error_code="ROLE_NOT_FOUND")

        hashed_pwd = get_password_hash(data.password)

        new_user = User(
            email=data.email,
            phone=data.phone,
            hashed_password=hashed_pwd,
            full_name=data.full_name,
            role_id=role.id,
            society_id=data.society_id,
            is_active=True,
            is_verified=False,
        )
        user = await user_repo.create(db, obj_in=new_user)
        await db.flush()
        return user

    @staticmethod
    async def login_user(db: AsyncSession, data: LoginRequest, ip_address: Optional[str], user_agent: Optional[str]) -> Dict[str, Any]:
        """
        Authenticate user, lock account on consecutive failures, register/bind devices,
        enforce max 3 active sessions, and return JWT credentials.
        """
        # Lookup by email first, then phone
        user = await user_repo.get_by_email(db, data.email)
        if not user:
            user = await user_repo.get_by_phone(db, data.email)

        if not user:
            raise AuthenticationError(detail="Invalid email or password.")

        # Check lock status
        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            time_left = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() / 60)
            raise AuthenticationError(
                detail=f"Account is temporarily locked. Try again in {time_left} minutes.",
                error_code="ACCOUNT_LOCKED",
            )

        # Verify password
        if not verify_password(data.password, user.hashed_password):
            # Increment failed attempts
            await user_repo.increment_login_attempts(db, user)
            raise AuthenticationError(detail="Invalid email or password.")

        # If locked, check & reset attempts
        if user.login_attempts > 0:
            await user_repo.reset_login_attempts(db, user)

        if not user.is_active:
            raise ForbiddenError(detail="User account is deactivated.")

        if not user.is_verified:
            raise ForbiddenError(
                detail="Email address is not verified. Please verify your email first.",
                error_code="EMAIL_NOT_VERIFIED"
            )

        # Register or retrieve device binding
        device_obj = None
        if data.push_token or data.device_model:
            # Check if device already registered for this user
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

        # Enforce max 3 active sessions
        active_sessions = await session_repo.get_active_sessions_by_user_id(db, user.id)
        if len(active_sessions) >= 3:
            # Revoke oldest sessions to make space (e.g. if active count is 3, revoke 1 to allow current login)
            to_revoke_count = len(active_sessions) - 2
            for i in range(to_revoke_count):
                oldest_session = active_sessions[i]
                oldest_session.is_active = False
                db.add(oldest_session)
            await db.flush()

        # Create new session
        session_id = uuid.uuid4()
        temp_refresh_token = create_refresh_token(
            user_id=str(user.id),
            session_id=str(session_id),
            token_version=1
        )
        refresh_hash = hash_token(temp_refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        new_session = Session(
            id=session_id,
            user_id=user.id,
            device_id=device_obj.id if device_obj else None,
            refresh_token_hash=refresh_hash,
            ip_address=ip_address,
            user_agent=user_agent,
            token_version=1,
            is_active=True,
            expires_at=expires_at,
        )
        await session_repo.create(db, obj_in=new_session)
        await db.flush()

        # Prepare permissions list
        user_permissions = [p.name for p in user.role.permissions]

        # Generate access token
        access_token = create_access_token(
            user_id=str(user.id),
            society_id=str(user.society_id) if user.society_id else None,
            role=user.role.name,
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
    async def create_session_for_user(
        db: AsyncSession,
        user: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        # Enforce max 3 active sessions
        active_sessions = await session_repo.get_active_sessions_by_user_id(db, user.id)
        if len(active_sessions) >= 3:
            to_revoke_count = len(active_sessions) - 2
            for i in range(to_revoke_count):
                oldest_session = active_sessions[i]
                oldest_session.is_active = False
                db.add(oldest_session)
            await db.flush()

        # Create new session
        session_id = uuid.uuid4()
        temp_refresh_token = create_refresh_token(
            user_id=str(user.id),
            session_id=str(session_id),
            token_version=1
        )
        refresh_hash = hash_token(temp_refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        new_session = Session(
            id=session_id,
            user_id=user.id,
            refresh_token_hash=refresh_hash,
            ip_address=ip_address,
            user_agent=user_agent,
            token_version=1,
            is_active=True,
            expires_at=expires_at,
        )
        await session_repo.create(db, obj_in=new_session)
        await db.flush()

        # Prepare permissions list
        user_permissions = [p.name for p in user.role.permissions]

        # Generate access token
        access_token = create_access_token(
            user_id=str(user.id),
            society_id=str(user.society_id) if user.society_id else None,
            role=user.role.name,
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
        Validate refresh token, check for reuse/replay attack, update/rotate refresh token,
        and generate a new access/refresh token pair.
        """
        payload = verify_token(refresh_token)
        if not payload or payload.get("token_type") != TokenType.REFRESH.value:
            raise AuthenticationError(detail="Invalid or expired refresh token.", error_code="INVALID_REFRESH_TOKEN")

        user_id = payload.get("sub")
        session_id = payload.get("session_id")
        token_version = payload.get("token_version")

        # Query session
        token_hash = hash_token(refresh_token)
        session = await session_repo.get(db, uuid.UUID(session_id))

        # Replay Attack Detection:
        # If session is inactive OR does not exist OR version mismatch
        if not session or not session.is_active or session.refresh_token_hash != token_hash or session.token_version != token_version:
            # Token Reuse detected! Revoke ALL active sessions for this user for security compliance.
            if session:
                await session_repo.revoke_all_user_sessions(db, session.user_id)
            raise AuthenticationError(
                detail="Security breach detected: Refresh token reuse. All active sessions have been terminated.",
                error_code="REFRESH_TOKEN_REUSE"
            )

        # Increment session version and rotate token
        session.token_version += 1
        new_refresh_token = create_refresh_token(
            user_id=user_id,
            session_id=session_id,
            token_version=session.token_version
        )
        session.refresh_token_hash = hash_token(new_refresh_token)
        session.expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        db.add(session)
        await db.flush()

        # Generate new access token
        user = session.user
        user_permissions = [p.name for p in user.role.permissions]
        access_token = create_access_token(
            user_id=str(user.id),
            society_id=str(user.society_id) if user.society_id else None,
            role=user.role.name,
            permissions=user_permissions,
            session_id=str(session.id),
        )

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
        }

    @staticmethod
    async def logout_session(db: AsyncSession, refresh_token: str) -> None:
        """
        Logout current session.
        """
        payload = verify_token(refresh_token)
        if not payload:
            raise AuthenticationError(detail="Invalid refresh token.")

        session_id = payload.get("session_id")
        if session_id:
            await session_repo.revoke_session(db, uuid.UUID(session_id))

    @staticmethod
    async def logout_all_sessions(db: AsyncSession, user_id: uuid.UUID) -> None:
        """
        Revoke all active sessions for a user.
        """
        await session_repo.revoke_all_user_sessions(db, user_id)

    @staticmethod
    async def change_password(db: AsyncSession, user: User, data: ChangePasswordRequest) -> None:
        """
        Change user password. Requires verification of the current password.
        Terminates all other sessions.
        """
        if not verify_password(data.current_password, user.hashed_password):
            raise ValidationError(detail="Current password is incorrect.", error_code="INVALID_CURRENT_PASSWORD")

        user.hashed_password = get_password_hash(data.new_password)
        db.add(user)
        await db.flush()

        # Revoke all other user sessions since security credentials changed
        await session_repo.revoke_all_user_sessions(db, user.id)

    @staticmethod
    async def request_password_reset(db: AsyncSession, email: str) -> None:
        """
        Generate and send an OTP code for password reset.
        """
        user = await user_repo.get_by_email(db, email)
        if not user:
            # For security compliance (to avoid email enumeration),
            # do not throw error. Just log and return success.
            return

        from app.services.otp import OTPService
        from app.core.constants import OtpPurpose
        await OTPService.generate_and_send_otp(db, email, OtpPurpose.RESET.value)

    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
        """
        Reset user password using token. Revokes all active sessions.
        """
        token_hash = hash_token(token)
        # Query password reset token
        from sqlalchemy import select
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

        # Mark reset token as used
        reset_record.is_used = True
        db.add(reset_record)

        # Revoke all user sessions for safety
        await session_repo.revoke_all_user_sessions(db, user.id)
        await db.flush()


