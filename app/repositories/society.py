import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.society import Society


class SocietyRepository(BaseRepository[Society]):
    def __init__(self):
        super().__init__(Society)

    async def get_active(self, db: AsyncSession, id: uuid.UUID) -> Optional[Society]:
        """
        Fetch a single active (non-soft-deleted) society.
        """
        query = select(self.model).where(
            and_(
                self.model.id == id,
                self.model.deleted_at.is_(None)
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_multi_active(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100, search: Optional[str] = None
    ) -> List[Society]:
        """
        Fetch multiple active societies, with optional search filter by name or region.
        """
        query = select(self.model).where(self.model.deleted_at.is_(None))
        if search:
            query = query.where(
                (self.model.name.ilike(f"%{search}%")) | (self.model.region.ilike(f"%{search}%"))
            )
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_by_name_and_region(self, db: AsyncSession, name: str, region: str) -> Optional[Society]:
        """
        Check for a society with the same name and region (active only).
        """
        query = select(self.model).where(
            and_(
                self.model.name == name,
                self.model.region == region,
                self.model.deleted_at.is_(None)
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def delete_soft(self, db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> Optional[Society]:
        """
        Perform a soft delete by setting deleted_at to current time and updated_by to user_id.
        """
        db_obj = await self.get(db, id)
        if db_obj and db_obj.deleted_at is None:
            db_obj.deleted_at = datetime.now(timezone.utc)
            if user_id:
                db_obj.updated_by = user_id
            db.add(db_obj)
            await db.flush()
        return db_obj
