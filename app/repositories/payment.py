import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.payment import Payment, PaymentReceipt
from app.repositories.base import BaseRepository


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self):
        super().__init__(Payment)

    async def get_active(self, db: AsyncSession, id: uuid.UUID) -> Optional[Payment]:
        query = (
            select(self.model)
            .where(and_(self.model.id == id, self.model.deleted_at.is_(None)))
            .options(selectinload(self.model.receipt))
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_gateway_order_id(self, db: AsyncSession, gateway_order_id: str) -> Optional[Payment]:
        query = select(self.model).where(
            and_(
                self.model.gateway_order_id == gateway_order_id,
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
        bill_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Payment]:
        query = (
            select(self.model)
            .where(self.model.deleted_at.is_(None))
            .options(selectinload(self.model.receipt))
            .order_by(self.model.created_at.desc())
        )
        if society_id:
            query = query.where(self.model.society_id == society_id)
        if bill_id:
            query = query.where(self.model.bill_id == bill_id)
        if status:
            query = query.where(self.model.status == status)

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_history(
        self,
        db: AsyncSession,
        *,
        society_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Payment]:
        return await self.get_multi_active(db, society_id=society_id, skip=skip, limit=limit)

    async def create_receipt(self, db: AsyncSession, receipt: PaymentReceipt) -> PaymentReceipt:
        db.add(receipt)
        await db.flush()
        return receipt

    async def get_receipt_by_payment_id(self, db: AsyncSession, payment_id: uuid.UUID) -> Optional[PaymentReceipt]:
        query = select(PaymentReceipt).where(PaymentReceipt.payment_id == payment_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def delete_soft(
        self, db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None
    ) -> Optional[Payment]:
        db_obj = await self.get(db, id)
        if db_obj and db_obj.deleted_at is None:
            db_obj.deleted_at = datetime.now(timezone.utc)
            if user_id:
                db_obj.updated_by = user_id
            db.add(db_obj)
            await db.flush()
        return db_obj
