from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.user import User


class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """
        Fetch a user by their email.
        """
        query = select(User).where(User.email == email)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_phone(self, db: AsyncSession, phone: str) -> Optional[User]:
        """
        Fetch a user by their phone number.
        """
        query = select(User).where(User.phone == phone)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def increment_login_attempts(self, db: AsyncSession, user: User, max_attempts: int = 5, lock_minutes: int = 15) -> User:
        """
        Increment failed login attempts and lock account if max_attempts is reached.
        """
        user.login_attempts += 1
        if user.login_attempts >= max_attempts:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=lock_minutes)
        db.add(user)
        await db.flush()
        return user

    async def reset_login_attempts(self, db: AsyncSession, user: User) -> User:
        """
        Reset failed login attempts and unlock the account.
        """
        user.login_attempts = 0
        user.locked_until = None
        db.add(user)
        await db.flush()
        return user
