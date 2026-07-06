import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.society import SocietySettings


class SocietySettingsRepository(BaseRepository[SocietySettings]):
    def __init__(self):
        super().__init__(SocietySettings)

    async def get_by_society_id(self, db: AsyncSession, society_id: uuid.UUID) -> Optional[SocietySettings]:
        """
        Fetch settings for a specific society.
        """
        query = select(self.model).where(
            and_(
                self.model.society_id == society_id,
                self.model.deleted_at.is_(None)
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def delete_soft(self, db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> Optional[SocietySettings]:
        """
        Soft delete settings.
        """
        db_obj = await self.get(db, id)
        if db_obj and db_obj.deleted_at is None:
            db_obj.deleted_at = datetime.now(timezone.utc)
            if user_id:
                db_obj.updated_by = user_id
            db.add(db_obj)
            await db.flush()
        return db_obj

