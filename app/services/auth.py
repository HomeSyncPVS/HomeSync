import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger("homesync.auth")

from app.db.database import AsyncSessionLocal
from app.core.config import settings
from app.core.constants import RoleEnum, TokenType, OtpPurpose
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    hash_token,
    verify_token,
)
from app.models.user import User
from app.models.session import Session as UserSession
from app.models.device import Device
from app.models.password_reset import PasswordReset
from app.repositories.user import UserRepository
from app.repositories.role import RoleRepository
from app.repositories.session import SessionRepository
from app.repositories.device import DeviceRepository
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

user_repo = UserRepository()
role_repo = RoleRepository()
session_repo = SessionRepository()
device_repo = DeviceRepository()


class AuthService:
    @staticmethod
    async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
        """
        Create a new user directly in PostgreSQL with Argon2 password hash.
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

        user_id = uuid.uuid4()
        hashed_pw = get_password_hash(data.password)

        new_user = User(
            id=user_id,
            email=data.email,
            phone=data.phone,
            hashed_password=hashed_pw,
            full_name=data.full_name,
            role_id=role.id,
            society_id=data.society_id,
            is_active=True,
            is_verified=False,
        )
        user = await user_repo.create(db, obj_in=new_user)
        await db.flush()

        # Custom OTP generation and sending for email confirmation via Brevo
        from app.services.otp import OTPService
        import asyncio

        async def _send_otp_background():
            async with AsyncSessionLocal() as bg_db:
                try:
                    await OTPService.generate_and_send_otp(bg_db, data.email, "register")
                    await bg_db.commit()
                    logger.info(f"[Registration] Custom OTP email sent successfully to {data.email}")
                except Exception as otp_err:
                    logger.error(f"[Registration Background Error] Failed to send registration OTP email to {data.email}: {str(otp_err)}")

        asyncio.create_task(_send_otp_background())

        return user

    @staticmethod
    async def login_user(db: AsyncSession, data: LoginRequest, ip_address: Optional[str], user_agent: Optional[str]) -> Dict[str, Any]:
        """
        Authenticate user directly against PostgreSQL using Argon2 password verification,
        register/bind device, create session in homesync.sessions, and return JWT credentials.
        """
        user = await user_repo.get_by_email(db, data.email)
        if not user:
            user = await user_repo.get_by_phone(db, data.email)
        if not user:
            raise AuthenticationError(detail="Invalid email or password.")

        if not user.is_active:
            raise ForbiddenError(detail="User account is deactivated.")

        if not verify_password(data.password, user.hashed_password):
            raise AuthenticationError(detail="Invalid email or password.")

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
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        user_permissions = [p.name for p in user.role.permissions] if user.role and user.role.permissions else []
        role_name = user.role.name if user.role else "Resident"

        access_token = create_access_token(
            user_id=str(user.id),
            role=role_name,
            permissions=user_permissions,
            session_id=str(session_id),
            society_id=str(user.society_id) if user.society_id else None,
        )
        refresh_token = create_refresh_token(
            user_id=str(user.id),
            session_id=str(session_id),
        )

        session_obj = UserSession(
            id=session_id,
            user_id=user.id,
            device_id=device_obj.id if device_obj else None,
            refresh_token_hash=hash_token(refresh_token),
            ip_address=ip_address,
            user_agent=user_agent,
            is_active=True,
            expires_at=expires_at,
        )
        await session_repo.create(db, obj_in=session_obj)
        await db.flush()

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
        Creates session object in PostgreSQL and returns JWT tokens.
        """
        session_id = uuid.uuid4()
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        user_permissions = [p.name for p in user.role.permissions] if user.role and user.role.permissions else []
        role_name = user.role.name if user.role else "Resident"

        access_token = create_access_token(
            user_id=str(user.id),
            role=role_name,
            permissions=user_permissions,
            session_id=str(session_id),
            society_id=str(user.society_id) if user.society_id else None,
        )
        refresh_token = create_refresh_token(
            user_id=str(user.id),
            session_id=str(session_id),
        )

        session_obj = UserSession(
            id=session_id,
            user_id=user.id,
            refresh_token_hash=hash_token(refresh_token),
            ip_address=ip_address,
            user_agent=user_agent,
            is_active=True,
            expires_at=expires_at,
        )
        await session_repo.create(db, obj_in=session_obj)
        await db.flush()

        user_permissions = [p.name for p in user.role.permissions] if user.role and user.role.permissions else []
        role_name = user.role.name if user.role else "Resident"

        access_token = create_access_token(
            user_id=str(user.id),
            role=role_name,
            permissions=user_permissions,
            session_id=str(session_id),
            society_id=str(user.society_id) if user.society_id else None,
        )
        refresh_token = create_refresh_token(
            user_id=str(user.id),
            session_id=str(session_id),
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "session_id": session_id,
            "user": user,
        }

    @staticmethod
    async def refresh_access_token(db: AsyncSession, refresh_token: str) -> Dict[str, str]:
        """
        Validate refresh token, verify active session in DB, and rotate tokens.
        """
        payload = verify_token(refresh_token)
        if not payload or payload.get("token_type") != TokenType.REFRESH.value:
            raise AuthenticationError(detail="Invalid or expired refresh token.")

        user_id_str = payload.get("sub")
        session_id_str = payload.get("session_id")
        if not user_id_str or not session_id_str:
            raise AuthenticationError(detail="Invalid refresh token payload.")

        user_id = uuid.UUID(user_id_str)
        session_id = uuid.UUID(session_id_str)

        user = await user_repo.get(db, user_id)
        if not user or not user.is_active:
            raise AuthenticationError(detail="User inactive or not found.")

        session_obj = await session_repo.get(db, session_id)
        if not session_obj or not session_obj.is_active:
            raise AuthenticationError(detail="Session is inactive or revoked.")

        user_permissions = [p.name for p in user.role.permissions] if user.role and user.role.permissions else []
        role_name = user.role.name if user.role else "Resident"

        new_access_token = create_access_token(
            user_id=str(user.id),
            role=role_name,
            permissions=user_permissions,
            session_id=str(session_id),
            society_id=str(user.society_id) if user.society_id else None,
        )
        new_refresh_token = create_refresh_token(
            user_id=str(user.id),
            session_id=str(session_id),
        )

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
        }

    @staticmethod
    async def logout_session(db: AsyncSession, refresh_token: str, token: Optional[str] = None) -> None:
        """
        Revoke active session in homesync.sessions.
        """
        payload = verify_token(refresh_token) if refresh_token else None
        if payload and payload.get("session_id"):
            session_id = uuid.UUID(payload["session_id"])
            session_obj = await session_repo.get(db, session_id)
            if session_obj:
                session_obj.is_active = False
                db.add(session_obj)
                await db.flush()

    @staticmethod
    async def logout_all_sessions(db: AsyncSession, user_id: uuid.UUID, token: Optional[str] = None) -> None:
        """
        Revoke all active sessions for a user in homesync.sessions.
        """
        sessions = await session_repo.get_user_sessions(db, user_id)
        for session_obj in sessions:
            session_obj.is_active = False
            db.add(session_obj)
        await db.flush()

    @staticmethod
    async def change_password(db: AsyncSession, user: User, data: ChangePasswordRequest, token: Optional[str] = None) -> None:
        """
        Change user password in homesync.users. Requires verification of current password.
        """
        if not verify_password(data.current_password, user.hashed_password):
            raise ValidationError(detail="Current password is incorrect.", error_code="INVALID_CURRENT_PASSWORD")

        user.hashed_password = get_password_hash(data.new_password)
        user.login_attempts = 0
        user.locked_until = None
        db.add(user)
        await db.flush()

    @staticmethod
    async def request_password_reset(db: AsyncSession, email: str) -> None:
        """
        Generate and send 6-digit password reset OTP email via Brevo.
        """
        user = await user_repo.get_by_email(db, email)
        if not user:
            return

        from app.services.otp import OTPService
        await OTPService.generate_and_send_otp(db, email, OtpPurpose.RESET.value)

    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
        """
        Reset user password using token in homesync.password_resets or verified OTP.
        """
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

        user = await user_repo.get(db, reset_record.user_id)
        if not user:
            raise NotFoundError(detail="User not found.")

        user.hashed_password = get_password_hash(new_password)
        user.login_attempts = 0
        user.locked_until = None
        db.add(user)

        reset_record.is_used = True
        db.add(reset_record)
        await db.flush()
