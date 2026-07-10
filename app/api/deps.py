import uuid
from typing import AsyncGenerator, List, Optional
from fastapi import Depends, Security
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.repositories.user import UserRepository
from app.repositories.session import SessionRepository
from app.exceptions.custom import AuthenticationError, ForbiddenError
from app.core.security import verify_token

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

user_repo = UserRepository()
session_repo = SessionRepository()


from app.utils.supabase_auth import SupabaseAuthClient


async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    """
    Decodes the JWT access token using Supabase and returns the authenticated User.
    """
    supabase_user = await SupabaseAuthClient.verify_access_token(token)
    user_id = supabase_user.get("id")

    if not user_id:
        raise AuthenticationError(detail="Invalid or expired access token.", error_code="INVALID_ACCESS_TOKEN")

    user = await user_repo.get(db, uuid.UUID(user_id))
    if not user:
        raise AuthenticationError(detail="User not found.", error_code="USER_NOT_FOUND")

    if not user.is_active:
        raise ForbiddenError(detail="User account is deactivated.")

    # Dynamically sync is_verified status if confirmed in Supabase
    if supabase_user.get("is_verified") and not user.is_verified:
        user.is_verified = True
        db.add(user)
        await db.flush()

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency checking that the authenticated user is active.
    """
    if not current_user.is_active:
        raise ForbiddenError(detail="Inactive user.")
    return current_user


async def get_current_verified_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency checking that the authenticated user is verified.
    """
    if not current_user.is_verified:
        raise ForbiddenError(detail="Email address must be verified.", error_code="EMAIL_NOT_VERIFIED")
    return current_user


class PermissionChecker:
    def __init__(self, required_permission: str):
        """
        Dynamically check roles and permissions.
        """
        self.required_permission = required_permission

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        # Super Admin bypasses all checks
        if current_user.role.name == "Super Admin":
            return current_user

        # Get list of permissions
        permissions = [p.name for p in current_user.role.permissions]
        if self.required_permission not in permissions:
            raise ForbiddenError(
                detail=f"Action requires permission: {self.required_permission}"
            )
        return current_user
