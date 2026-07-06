import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.bill import MaintenanceBill, BillItem


class BillRepository(BaseRepository[MaintenanceBill]):
    def __init__(self):
        super().__init__(MaintenanceBill)

    async def get_active(self, db: AsyncSession, id: uuid.UUID) -> Optional[MaintenanceBill]:
        """
        Get active bill with loaded line items.
        """
        query = select(self.model).where(
            and_(
                self.model.id == id,
                self.model.deleted_at.is_(None)
            )
        ).options(selectinload(self.model.items))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_number(self, db: AsyncSession, society_id: uuid.UUID, bill_number: str) -> Optional[MaintenanceBill]:
        """
        Fetch active bill by society_id and bill_number.
        """
        query = select(self.model).where(
            and_(
                self.model.society_id == society_id,
                self.model.bill_number == bill_number,
                self.model.deleted_at.is_(None)
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_multi_bills(
        self,
        db: AsyncSession,
        *,
        society_id: uuid.UUID,
        flat_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        bill_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MaintenanceBill]:
        """
        Fetch filtered list of bills.
        """
        query = select(self.model).where(
            and_(
                self.model.society_id == society_id,
                self.model.deleted_at.is_(None)
            )
        )
        if flat_id:
            query = query.where(self.model.flat_id == flat_id)
        if status:
            query = query.where(self.model.status == status)
        if bill_type:
            query = query.where(self.model.bill_type == bill_type)

        query = query.options(selectinload(self.model.items)).order_by(self.model.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_max_bill_number_sequence(self, db: AsyncSession, society_id: uuid.UUID, prefix: str) -> int:
        """
        Retrieve max sequence number for a bill number prefix like 'BILL-202607-'.
        """
        query = select(self.model.bill_number).where(
            and_(
                self.model.society_id == society_id,
                self.model.bill_number.like(f"{prefix}%")
            )
        )
        result = await db.execute(query)
        bill_numbers = result.scalars().all()
        if not bill_numbers:
            return 0
        
        max_seq = 0
        for num in bill_numbers:
            try:
                parts = num.split("-")
                if len(parts) >= 3:
                    seq = int(parts[2])
                    if seq > max_seq:
                        max_seq = seq
            except ValueError:
                continue
        return max_seq

    async def get_outstanding_bills(
        self, db: AsyncSession, *, society_id: uuid.UUID, flat_id: Optional[uuid.UUID] = None
    ) -> List[MaintenanceBill]:
        """
        Fetch unpaid/overdue bills with outstanding amounts.
        """
        query = select(self.model).where(
            and_(
                self.model.society_id == society_id,
                self.model.outstanding_amount > 0,
                self.model.deleted_at.is_(None)
            )
        )
        if flat_id:
            query = query.where(self.model.flat_id == flat_id)
        query = query.options(selectinload(self.model.items)).order_by(self.model.due_date.asc())
        result = await db.execute(query)
        return list(result.scalars().all())

    async def create_bill_item(self, db: AsyncSession, *, bill_id: uuid.UUID, name: str, amount: float) -> BillItem:
        """
        Create a new bill line item.
        """
        db_item = BillItem(bill_id=bill_id, name=name, amount=amount)
        db.add(db_item)
        await db.flush()
        return db_item
