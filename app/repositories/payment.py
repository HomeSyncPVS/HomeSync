import uuid
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.payment import Payment, PaymentReceipt


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self):
        super().__init__(Payment)

    async def get_active(self, db: AsyncSession, id: uuid.UUID) -> Optional[Payment]:
        """
        Get active payment with receipt relationship.
        """
        query = select(self.model).where(
            and_(
                self.model.id == id,
                self.model.deleted_at.is_(None)
            )
        ).options(selectinload(self.model.receipt))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_multi_payments(
        self,
        db: AsyncSession,
        *,
        society_id: Optional[uuid.UUID] = None,
        flat_id: Optional[uuid.UUID] = None,
        bill_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Payment]:
        """
        Fetch filtered list of payments.
        """
        filters = [self.model.deleted_at.is_(None)]
        if society_id:
            filters.append(self.model.society_id == society_id)
        if flat_id:
            filters.append(self.model.flat_id == flat_id)
        if bill_id:
            filters.append(self.model.bill_id == bill_id)
        if status:
            filters.append(self.model.status == status)

        query = select(self.model).where(and_(*filters)).options(selectinload(self.model.receipt)).order_by(self.model.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_max_payment_number_sequence(self, db: AsyncSession, society_id: uuid.UUID, prefix: str) -> int:
        """
        Retrieve max sequence number for a payment number prefix like 'PAY-202607-'.
        """
        query = select(self.model.payment_number).where(
            and_(
                self.model.society_id == society_id,
                self.model.payment_number.like(f"{prefix}%")
            )
        )
        result = await db.execute(query)
        payment_numbers = result.scalars().all()
        if not payment_numbers:
            return 0
        
        max_seq = 0
        for num in payment_numbers:
            try:
                parts = num.split("-")
                if len(parts) >= 3:
                    seq = int(parts[2])
                    if seq > max_seq:
                        seq = seq
                    if seq > max_seq:
                        max_seq = seq
            except ValueError:
                continue
        return max_seq

    async def create_receipt(self, db: AsyncSession, *, payment_id: uuid.UUID, receipt_number: str, pdf_url: Optional[str] = None) -> PaymentReceipt:
        """
        Create a payment receipt record.
        """
        db_receipt = PaymentReceipt(
            payment_id=payment_id,
            receipt_number=receipt_number,
            pdf_url=pdf_url
        )
        db.add(db_receipt)
        await db.flush()
        return db_receipt
