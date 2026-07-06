import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.floor import Floor


class FloorRepository(BaseRepository[Floor]):
    def __init__(self):
        super().__init__(Floor)

    async def get_active(self, db: AsyncSession, id: uuid.UUID) -> Optional[Floor]:
        """
        Fetch a single active floor.
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
        self, db: AsyncSession, *, wing_id: Optional[uuid.UUID] = None, skip: int = 0, limit: int = 100
    ) -> List[Floor]:
        """
        Fetch active floors. Filters by wing_id if provided.
        """
        query = select(self.model).where(self.model.deleted_at.is_(None))
        if wing_id:
            query = query.where(self.model.wing_id == wing_id)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_by_number_and_wing(self, db: AsyncSession, floor_number: int, wing_id: uuid.UUID) -> Optional[Floor]:
        """
        Find an active floor by its number inside a wing.
        """
        query = select(self.model).where(
            and_(
                self.model.floor_number == floor_number,
                self.model.wing_id == wing_id,
                self.model.deleted_at.is_(None)
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def delete_soft(self, db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> Optional[Floor]:
        """
        Soft delete a floor and update audit logs.
        """
        db_obj = await self.get(db, id)
        if db_obj and db_obj.deleted_at is None:
            db_obj.deleted_at = datetime.now(timezone.utc)
            if user_id:
                db_obj.updated_by = user_id
            db.add(db_obj)
            await db.flush()
        return db_obj
