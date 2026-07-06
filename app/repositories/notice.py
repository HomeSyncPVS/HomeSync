from typing import List, Optional
import uuid
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.notice import Notice
from datetime import datetime, timezone


class NoticeRepository(BaseRepository[Notice]):
    def __init__(self):
        super().__init__(Notice)

    async def get_active_notices(self, db: AsyncSession, society_id: uuid.UUID) -> List[Notice]:
        """
        Fetch all active (non-expired) notices for a society.
        """
        now = datetime.now(timezone.utc)
        query = select(Notice).where(
            Notice.society_id == society_id,
            Notice.deleted_at == None,
            or_(Notice.expires_at == None, Notice.expires_at > now)
        ).order_by(Notice.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_all_by_society(self, db: AsyncSession, society_id: uuid.UUID) -> List[Notice]:
        """
        Fetch all notices (including expired ones) for a society.
        """
        query = select(Notice).where(Notice.society_id == society_id, Notice.deleted_at == None).order_by(
            Notice.created_at.desc()
        )
        result = await db.execute(query)
        return list(result.scalars().all())
