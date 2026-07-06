import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.bill import MaintenanceBill
from app.repositories.base import BaseRepository


class BillRepository(BaseRepository[MaintenanceBill]):
    def __init__(self):
        super().__init__(MaintenanceBill)

    async def get_active(self, db: AsyncSession, id: uuid.UUID) -> Optional[MaintenanceBill]:
        query = (
            select(self.model)
            .where(and_(self.model.id == id, self.model.deleted_at.is_(None)))
            .options(selectinload(self.model.items))
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_bill_number(
        self, db: AsyncSession, society_id: uuid.UUID, bill_number: str
    ) -> Optional[MaintenanceBill]:
        query = select(self.model).where(
            and_(
                self.model.society_id == society_id,
                self.model.bill_number == bill_number,
                self.model.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_multi_active(
        self,
        db: AsyncSession,
        *,
        society_id: Optional[uuid.UUID] = None,
        flat_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[MaintenanceBill]:
        query = (
            select(self.model)
            .where(self.model.deleted_at.is_(None))
            .options(selectinload(self.model.items))
            .order_by(self.model.created_at.desc())
        )
        if society_id:
            query = query.where(self.model.society_id == society_id)
        if flat_id:
            query = query.where(self.model.flat_id == flat_id)
        if status:
            query = query.where(self.model.status == status)

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_outstanding(
        self, db: AsyncSession, *, society_id: uuid.UUID
    ) -> List[MaintenanceBill]:
        query = (
            select(self.model)
            .where(
                and_(
                    self.model.society_id == society_id,
                    self.model.deleted_at.is_(None),
                    self.model.status.in_(["GENERATED", "SENT", "PARTIALLY_PAID", "OVERDUE"]),
                    self.model.paid_amount < self.model.total_amount,
                )
            )
            .options(selectinload(self.model.items))
            .order_by(self.model.due_date.asc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def delete_soft(
        self, db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None
    ) -> Optional[MaintenanceBill]:
        db_obj = await self.get(db, id)
        if db_obj and db_obj.deleted_at is None:
            db_obj.deleted_at = datetime.now(timezone.utc)
            if user_id:
                db_obj.updated_by = user_id
            db.add(db_obj)
            await db.flush()
        return db_obj
