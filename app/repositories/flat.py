import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.flat import Flat


class FlatRepository(BaseRepository[Flat]):
    def __init__(self):
        super().__init__(Flat)

    async def get_active(self, db: AsyncSession, id: uuid.UUID) -> Optional[Flat]:
        """
        Fetch a single active flat.
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
        self,
        db: AsyncSession,
        *,
        society_id: Optional[uuid.UUID] = None,
        wing_id: Optional[uuid.UUID] = None,
        floor_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Flat]:
        """
        Fetch active flats, with optional filters for society_id, wing_id, and floor_id.
        """
        query = select(self.model).where(self.model.deleted_at.is_(None))
        if society_id:
            query = query.where(self.model.society_id == society_id)
        if wing_id:
            query = query.where(self.model.wing_id == wing_id)
        if floor_id:
            query = query.where(self.model.floor_id == floor_id)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_by_number_and_society(self, db: AsyncSession, flat_number: str, society_id: uuid.UUID) -> Optional[Flat]:
        """
        Find an active flat by its number inside a society.
        """
        query = select(self.model).where(
            and_(
                self.model.flat_number == flat_number,
                self.model.society_id == society_id,
                self.model.deleted_at.is_(None)
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def delete_soft(self, db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> Optional[Flat]:
        """
        Soft delete a flat and update audit logs.
        """
        db_obj = await self.get(db, id)
        if db_obj and db_obj.deleted_at is None:
            db_obj.deleted_at = datetime.now(timezone.utc)
            if user_id:
                db_obj.updated_by = user_id
            db.add(db_obj)
            await db.flush()
        return db_obj
