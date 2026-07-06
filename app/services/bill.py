import uuid
import logging
from datetime import datetime, date, timezone
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.custom import NotFoundError, ConflictError, ValidationError
from app.models.bill import MaintenanceBill, BillItem
from app.models.flat import Flat
from app.models.society import SocietySettings
from app.repositories.bill import BillRepository
from app.schemas.bill import BillCreate, BillUpdate, BulkBillGenerate

logger = logging.getLogger(__name__)
bill_repo = BillRepository()


class BillService:
    @staticmethod
    async def _generate_bill_number(db: AsyncSession, society_id: uuid.UUID) -> str:
        """
        Generate auto bill number in format: BILL-{YYYYMM}-{SEQ:04d}
        """
        now = datetime.now(timezone.utc)
        prefix = f"BILL-{now.strftime('%Y%m')}-"
        last_seq = await bill_repo.get_max_bill_number_sequence(db, society_id, prefix)
        new_seq = last_seq + 1
        return f"{prefix}{new_seq:04d}"

    @staticmethod
    async def create_bill(db: AsyncSession, data: BillCreate, society_id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> MaintenanceBill:
        # Check if flat exists and belongs to the society
        query = select(Flat).where(and_(Flat.id == data.flat_id, Flat.deleted_at.is_(None)))
        result = await db.execute(query)
        flat = result.scalar_one_or_none()
        if not flat:
            raise NotFoundError("Flat not found.")
        if flat.society_id != society_id:
            raise ValidationError("Flat does not belong to this society.")

        # Calculate subtotal
        subtotal = sum(item.amount for item in data.items)
        total_amount = subtotal
        
        bill_number = await BillService._generate_bill_number(db, society_id)

        bill_obj = MaintenanceBill(
            society_id=society_id,
            flat_id=data.flat_id,
            bill_number=bill_number,
            bill_type=data.bill_type,
            status="DRAFT",
            due_date=data.due_date,
            billing_period_start=data.billing_period_start,
            billing_period_end=data.billing_period_end,
            subtotal=subtotal,
            total_amount=total_amount,
            outstanding_amount=total_amount,
            created_by=user_id,
            updated_by=user_id,
        )
        bill = await bill_repo.create(db, obj_in=bill_obj)

        # Create line items
        for item in data.items:
            await bill_repo.create_bill_item(db, bill_id=bill.id, name=item.name, amount=item.amount)

        await db.commit()
        # Refresh to load relationships
        db.add(bill)
        await db.refresh(bill)
        return bill

    @staticmethod
    async def bulk_generate_bills(db: AsyncSession, data: BulkBillGenerate, society_id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> int:
        # Fetch all active flats in the society
        query = select(Flat).where(and_(Flat.society_id == society_id, Flat.deleted_at.is_(None)))
        result = await db.execute(query)
        flats = result.scalars().all()
        if not flats:
            raise ValidationError("No active flats found in this society to bill.")

        now = datetime.now(timezone.utc)
        prefix = f"BILL-{now.strftime('%Y%m')}-"
        last_seq = await bill_repo.get_max_bill_number_sequence(db, society_id, prefix)

        generated_count = 0
        for i, flat in enumerate(flats):
            seq = last_seq + 1 + i
            bill_number = f"{prefix}{seq:04d}"

            bill_obj = MaintenanceBill(
                society_id=society_id,
                flat_id=flat.id,
                bill_number=bill_number,
                bill_type=data.bill_type,
                status="DRAFT",
                due_date=data.due_date,
                billing_period_start=data.billing_period_start,
                billing_period_end=data.billing_period_end,
                subtotal=data.fixed_amount,
                total_amount=data.fixed_amount,
                outstanding_amount=data.fixed_amount,
                created_by=user_id,
                updated_by=user_id,
            )
            bill = await bill_repo.create(db, obj_in=bill_obj)
            await bill_repo.create_bill_item(db, bill_id=bill.id, name=data.item_name, amount=data.fixed_amount)
            generated_count += 1

        await db.commit()
        return generated_count

    @staticmethod
    async def get_bill(db: AsyncSession, id: uuid.UUID, society_id: uuid.UUID) -> MaintenanceBill:
        bill = await bill_repo.get_active(db, id)
        if not bill or bill.society_id != society_id:
            raise NotFoundError("Bill not found.")
        return bill

    @staticmethod
    async def get_multi_bills(
        db: AsyncSession,
        society_id: uuid.UUID,
        flat_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        bill_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MaintenanceBill]:
        return await bill_repo.get_multi_bills(
            db,
            society_id=society_id,
            flat_id=flat_id,
            status=status,
            bill_type=bill_type,
            skip=skip,
            limit=limit
        )

    @staticmethod
    async def update_bill(db: AsyncSession, id: uuid.UUID, data: BillUpdate, society_id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> MaintenanceBill:
        bill = await BillService.get_bill(db, id, society_id)
        
        # Calculate updated outstanding amount if status or late_fee changes
        update_dict = data.model_dump(exclude_unset=True)
        if "late_fee" in update_dict:
            bill.late_fee = update_dict["late_fee"]
            bill.total_amount = bill.subtotal + bill.late_fee
            bill.outstanding_amount = bill.total_amount - bill.paid_amount
        
        if "status" in update_dict:
            bill.status = update_dict["status"]

        # Save updates
        bill.updated_by = user_id
        await bill_repo.update(db, db_obj=bill, obj_in=update_dict)
        await db.commit()
        await db.refresh(bill)
        return bill

    @staticmethod
    async def delete_bill(db: AsyncSession, id: uuid.UUID, society_id: uuid.UUID) -> None:
        bill = await BillService.get_bill(db, id, society_id)
        await bill_repo.delete(db, id=bill.id)
        await db.commit()

    @staticmethod
    async def send_bill(db: AsyncSession, id: uuid.UUID, society_id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> MaintenanceBill:
        bill = await BillService.get_bill(db, id, society_id)
        if bill.status != "DRAFT":
            raise ValidationError("Only draft bills can be sent.")
        
        bill.status = "SENT"
        bill.sent_at = datetime.now(timezone.utc)
        bill.updated_by = user_id
        await db.commit()
        await db.refresh(bill)
        
        # Log/Stub: Trigger notification dispatcher here
        logger.info(f"Notification triggered for sent bill: {bill.bill_number} to flat ID: {bill.flat_id}")
        return bill

    @staticmethod
    async def apply_late_fees_if_overdue(db: AsyncSession, society_id: uuid.UUID) -> int:
        """
        Scan all active unpaid bills past their due date and apply late fees from society settings.
        """
        now = datetime.now(timezone.utc)
        
        # Get late fee settings
        query = select(SocietySettings).where(SocietySettings.society_id == society_id)
        result = await db.execute(query)
        settings = result.scalar_one_or_none()
        if not settings or settings.late_fee_percentage <= 0:
            return 0

        # Fetch overdue bills
        query_bills = select(MaintenanceBill).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.due_date < now,
                MaintenanceBill.status.in_(["SENT", "PARTIALLY_PAID"]),
                MaintenanceBill.deleted_at.is_(None)
            )
        )
        result_bills = await db.execute(query_bills)
        bills = result_bills.scalars().all()

        updated_count = 0
        for bill in bills:
            # Apply proportional late fee to outstanding balance if not already applied
            if bill.late_fee == 0:
                fee = round(bill.outstanding_amount * (settings.late_fee_percentage / 100.0), 2)
                bill.late_fee = fee
                bill.total_amount += fee
                bill.outstanding_amount += fee
                bill.status = "OVERDUE"
                updated_count += 1

        if updated_count > 0:
            await db.commit()
        return updated_count
