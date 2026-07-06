import uuid
from datetime import date, datetime, timezone
from typing import List, Optional
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import BillStatus
from app.exceptions.custom import ConflictError, NotFoundError, ValidationError
from app.models.bill import BillItem, MaintenanceBill
from app.models.flat import Flat
from app.models.society import SocietySettings
from app.repositories.bill import BillRepository
from app.repositories.flat import FlatRepository
from app.repositories.society import SocietyRepository

bill_repo = BillRepository()
flat_repo = FlatRepository()
society_repo = SocietyRepository()


class BillService:
    @staticmethod
    def _compute_item_amount(quantity: int, unit_price: float, amount: Optional[float]) -> float:
        if amount is not None:
            return round(float(amount), 2)
        return round(float(quantity) * float(unit_price), 2)

    @staticmethod
    def _compute_late_fee(subtotal: float, due_date: date, late_fee_percentage: float, as_of: date) -> float:
        if as_of <= due_date or subtotal <= 0:
            return 0.0
        days_overdue = (as_of - due_date).days
        proportional_factor = days_overdue / 30.0
        fee = subtotal * (late_fee_percentage / 100.0) * proportional_factor
        return round(max(fee, 0.0), 2)

    @staticmethod
    async def _generate_bill_number(db: AsyncSession, society_id: uuid.UUID, issue_date: date) -> str:
        yyyymm = issue_date.strftime("%Y%m")
        prefix = f"BILL-{yyyymm}-"

        query = select(func.max(MaintenanceBill.bill_number)).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.bill_number.like(f"{prefix}%"),
            )
        )
        result = await db.execute(query)
        max_bill_number = result.scalar_one_or_none()

        seq = 1
        if max_bill_number:
            try:
                seq = int(max_bill_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1

        return f"{prefix}{seq:04d}"

    @staticmethod
    async def _get_late_fee_percentage(db: AsyncSession, society_id: uuid.UUID) -> float:
        query = select(SocietySettings).where(
            and_(
                SocietySettings.society_id == society_id,
                SocietySettings.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        settings = result.scalar_one_or_none()
        if not settings:
            return 0.0
        return float(settings.late_fee_percentage or 0.0)

    @staticmethod
    async def create_bill(
        db: AsyncSession,
        data,
        user_id: Optional[uuid.UUID] = None,
    ) -> MaintenanceBill:
        society = await society_repo.get_active(db, data.society_id)
        if not society:
            raise NotFoundError(detail="Society not found or is inactive.", error_code="SOCIETY_NOT_FOUND")

        flat = await flat_repo.get_active(db, data.flat_id)
        if not flat:
            raise NotFoundError(detail="Flat not found or is inactive.", error_code="FLAT_NOT_FOUND")
        if flat.society_id != data.society_id:
            raise ValidationError(
                detail="Flat does not belong to the selected society.",
                error_code="INVALID_FLAT_SOCIETY",
            )

        bill_number = data.bill_number or await BillService._generate_bill_number(db, data.society_id, data.issue_date)
        existing = await bill_repo.get_by_bill_number(db, data.society_id, bill_number)
        if existing:
            raise ConflictError(
                detail=f"Bill number '{bill_number}' already exists for this society.",
                error_code="BILL_NUMBER_EXISTS",
            )

        subtotal = 0.0
        item_models: List[BillItem] = []
        for item in data.items:
            item_amount = BillService._compute_item_amount(item.quantity, item.unit_price, item.amount)
            subtotal += item_amount
            item_models.append(
                BillItem(
                    title=item.title,
                    description=item.description,
                    quantity=item.quantity,
                    unit_price=float(item.unit_price),
                    amount=item_amount,
                )
            )

        late_fee_percentage = await BillService._get_late_fee_percentage(db, data.society_id)
        late_fee = BillService._compute_late_fee(subtotal, data.due_date, late_fee_percentage, date.today())
        total_amount = round(subtotal + late_fee, 2)

        status = BillStatus.GENERATED.value
        if date.today() > data.due_date and total_amount > 0:
            status = BillStatus.OVERDUE.value

        bill_obj = MaintenanceBill(
            society_id=data.society_id,
            flat_id=data.flat_id,
            bill_number=bill_number,
            bill_type=data.bill_type.value,
            billing_period=data.billing_period,
            issue_date=data.issue_date,
            due_date=data.due_date,
            subtotal_amount=round(subtotal, 2),
            late_fee_amount=late_fee,
            total_amount=total_amount,
            paid_amount=0.0,
            status=status,
            notes=data.notes,
            created_by=user_id,
            updated_by=user_id,
            items=item_models,
        )
        bill = await bill_repo.create(db, obj_in=bill_obj)
        await db.commit()
        reloaded = await bill_repo.get_active(db, bill.id)
        if not reloaded:
            raise NotFoundError(detail="Bill not found after creation.", error_code="BILL_NOT_FOUND")
        return reloaded

    @staticmethod
    async def generate_bills(db: AsyncSession, data, user_id: Optional[uuid.UUID] = None) -> List[MaintenanceBill]:
        query = select(Flat).where(
            and_(
                Flat.society_id == data.society_id,
                Flat.deleted_at.is_(None),
            )
        )
        if data.flat_ids:
            query = query.where(Flat.id.in_(data.flat_ids))

        result = await db.execute(query)
        flats = list(result.scalars().all())
        if not flats:
            return []

        bills: List[MaintenanceBill] = []
        for flat in flats:
            payload = data.model_copy(update={"flat_id": flat.id})
            bill = await BillService.create_bill(db, payload, user_id=user_id)
            bills.append(bill)
        return bills

    @staticmethod
    async def get_bill(db: AsyncSession, id: uuid.UUID) -> MaintenanceBill:
        bill = await bill_repo.get_active(db, id)
        if not bill:
            raise NotFoundError(detail="Bill not found.", error_code="BILL_NOT_FOUND")
        return bill

    @staticmethod
    async def get_bills(
        db: AsyncSession,
        *,
        society_id: Optional[uuid.UUID] = None,
        flat_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[MaintenanceBill]:
        return await bill_repo.get_multi_active(
            db,
            society_id=society_id,
            flat_id=flat_id,
            status=status,
            skip=skip,
            limit=limit,
        )

    @staticmethod
    async def update_bill(db: AsyncSession, id: uuid.UUID, data, user_id: Optional[uuid.UUID] = None) -> MaintenanceBill:
        bill = await BillService.get_bill(db, id)

        if bill.status in [BillStatus.PAID.value, BillStatus.CANCELLED.value]:
            raise ValidationError(
                detail="Paid or cancelled bills cannot be modified.",
                error_code="BILL_NOT_EDITABLE",
            )

        update_dict = data.model_dump(exclude_unset=True)
        update_dict["updated_by"] = user_id

        if "status" in update_dict and update_dict["status"] is not None:
            update_dict["status"] = update_dict["status"].value

        if data.items is not None:
            bill.items.clear()
            subtotal = 0.0
            for item in data.items:
                quantity = item.quantity or 1
                unit_price = float(item.unit_price or 0.0)
                amount = BillService._compute_item_amount(quantity, unit_price, item.amount)
                subtotal += amount
                bill.items.append(
                    BillItem(
                        title=item.title or "Item",
                        description=item.description,
                        quantity=quantity,
                        unit_price=unit_price,
                        amount=amount,
                    )
                )

            late_fee_percentage = await BillService._get_late_fee_percentage(db, bill.society_id)
            late_fee = BillService._compute_late_fee(subtotal, bill.due_date, late_fee_percentage, date.today())
            bill.subtotal_amount = round(subtotal, 2)
            bill.late_fee_amount = late_fee
            bill.total_amount = round(subtotal + late_fee, 2)

        updated = await bill_repo.update(db, db_obj=bill, obj_in=update_dict)
        await db.commit()
        await db.refresh(updated)
        return updated

    @staticmethod
    async def delete_bill(db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> MaintenanceBill:
        bill = await BillService.get_bill(db, id)
        await bill_repo.delete_soft(db, id, user_id=user_id)
        await db.commit()
        return bill

    @staticmethod
    async def send_bill(db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> MaintenanceBill:
        bill = await BillService.get_bill(db, id)
        if bill.status == BillStatus.DRAFT.value:
            bill.status = BillStatus.SENT.value
        elif bill.status in [BillStatus.GENERATED.value, BillStatus.OVERDUE.value]:
            bill.status = BillStatus.SENT.value
        bill.updated_by = user_id
        db.add(bill)
        await db.commit()
        await db.refresh(bill)
        return bill

    @staticmethod
    async def get_outstanding(db: AsyncSession, society_id: uuid.UUID) -> List[MaintenanceBill]:
        bills = await bill_repo.get_outstanding(db, society_id=society_id)
        late_fee_percentage = await BillService._get_late_fee_percentage(db, society_id)

        today = date.today()
        for bill in bills:
            dynamic_late_fee = BillService._compute_late_fee(
                bill.subtotal_amount, bill.due_date, late_fee_percentage, today
            )
            if dynamic_late_fee != bill.late_fee_amount:
                bill.late_fee_amount = dynamic_late_fee
                bill.total_amount = round(bill.subtotal_amount + dynamic_late_fee, 2)
                if bill.paid_amount >= bill.total_amount:
                    bill.status = BillStatus.PAID.value
                elif today > bill.due_date:
                    bill.status = BillStatus.OVERDUE.value
                db.add(bill)

        await db.commit()
        return bills

    @staticmethod
    async def get_history(
        db: AsyncSession,
        *,
        society_id: uuid.UUID,
        flat_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[MaintenanceBill]:
        return await bill_repo.get_multi_active(
            db,
            society_id=society_id,
            flat_id=flat_id,
            skip=skip,
            limit=limit,
        )
