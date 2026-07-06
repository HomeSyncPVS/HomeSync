from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.notification import Notification


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self):
        super().__init__(Notification)

    async def get_by_user(self, db: AsyncSession, user_id: str, unread_only: bool = False) -> List[Notification]:
        """
        Fetch notifications for a user, option to fetch unread only.
        """
        query = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            query = query.where(Notification.read_at.is_(None))
        query = query.order_by(Notification.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())
