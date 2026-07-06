import json
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import BillStatus, PaymentStatus
from app.exceptions.custom import NotFoundError, ValidationError
from app.models.bill import MaintenanceBill
from app.models.payment import Payment, PaymentReceipt
from app.repositories.bill import BillRepository
from app.repositories.payment import PaymentRepository

bill_repo = BillRepository()
payment_repo = PaymentRepository()


class PaymentService:
    @staticmethod
    def _gateway_create_order(amount: float, currency: str = "INR") -> dict:
        # Payment gateway SDK integration point (Razorpay/Stripe/etc.)
        return {
            "order_id": f"order_{uuid.uuid4().hex[:20]}",
            "amount": round(amount, 2),
            "currency": currency,
            "status": "created",
        }

    @staticmethod
    def _gateway_verify(signature: Optional[str], transaction_reference: Optional[str]) -> bool:
        # Replace this with HMAC or SDK verification for production gateway integration.
        return bool(signature or transaction_reference)

    @staticmethod
    async def _generate_receipt_number(db: AsyncSession) -> str:
        today_prefix = datetime.now(timezone.utc).strftime("RCPT-%Y%m%d-")
        query = select(func.max(PaymentReceipt.receipt_number)).where(
            PaymentReceipt.receipt_number.like(f"{today_prefix}%")
        )
        result = await db.execute(query)
        current = result.scalar_one_or_none()

        seq = 1
        if current:
            try:
                seq = int(current.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        return f"{today_prefix}{seq:04d}"

    @staticmethod
    async def _recompute_bill_status(bill: MaintenanceBill) -> None:
        if bill.paid_amount >= bill.total_amount:
            bill.status = BillStatus.PAID.value
        elif bill.paid_amount > 0:
            bill.status = BillStatus.PARTIALLY_PAID.value

    @staticmethod
    async def create_order(db: AsyncSession, data, user_id: Optional[uuid.UUID] = None) -> Payment:
        bill = await bill_repo.get_active(db, data.bill_id)
        if not bill:
            raise NotFoundError(detail="Bill not found.", error_code="BILL_NOT_FOUND")

        if bill.status in [BillStatus.PAID.value, BillStatus.CANCELLED.value]:
            raise ValidationError(detail="This bill cannot be paid.", error_code="BILL_NOT_PAYABLE")

        outstanding = round(bill.total_amount - bill.paid_amount, 2)
        amount = round(float(data.amount if data.amount is not None else outstanding), 2)

        if amount <= 0:
            raise ValidationError(detail="Payment amount must be greater than zero.", error_code="INVALID_PAYMENT_AMOUNT")
        if amount > outstanding:
            raise ValidationError(
                detail=f"Payment amount cannot exceed outstanding amount ({outstanding}).",
                error_code="PAYMENT_EXCEEDS_OUTSTANDING",
            )

        gateway_order = PaymentService._gateway_create_order(amount)

        payment = Payment(
            bill_id=bill.id,
            society_id=bill.society_id,
            amount=amount,
            method=data.method.value,
            status=PaymentStatus.CREATED.value,
            gateway_order_id=gateway_order["order_id"],
            gateway_response=json.dumps(gateway_order),
            created_by=user_id,
            updated_by=user_id,
        )
        payment = await payment_repo.create(db, obj_in=payment)
        await db.commit()
        await db.refresh(payment)
        return payment

    @staticmethod
    async def verify_payment(db: AsyncSession, data, user_id: Optional[uuid.UUID] = None) -> Payment:
        payment = None
        if data.payment_id:
            payment = await payment_repo.get_active(db, data.payment_id)
        elif data.gateway_order_id:
            payment = await payment_repo.get_by_gateway_order_id(db, data.gateway_order_id)

        if not payment:
            raise NotFoundError(detail="Payment not found.", error_code="PAYMENT_NOT_FOUND")

        if payment.status == PaymentStatus.SUCCESS.value:
            return payment

        verified = PaymentService._gateway_verify(data.gateway_signature, data.transaction_reference)
        if not verified:
            payment.status = PaymentStatus.FAILED.value
            payment.updated_by = user_id
            db.add(payment)
            await db.commit()
            await db.refresh(payment)
            return payment

        payment.status = PaymentStatus.SUCCESS.value
        payment.gateway_payment_id = data.gateway_payment_id or payment.gateway_payment_id
        payment.gateway_signature = data.gateway_signature or payment.gateway_signature
        payment.transaction_reference = data.transaction_reference or payment.transaction_reference
        payment.paid_at = datetime.now(timezone.utc)
        payment.updated_by = user_id
        db.add(payment)

        bill = await bill_repo.get_active(db, payment.bill_id)
        if not bill:
            raise NotFoundError(detail="Bill not found.", error_code="BILL_NOT_FOUND")

        bill.paid_amount = round(float(bill.paid_amount) + float(payment.amount), 2)
        await PaymentService._recompute_bill_status(bill)
        bill.updated_by = user_id
        db.add(bill)

        existing_receipt = await payment_repo.get_receipt_by_payment_id(db, payment.id)
        if not existing_receipt:
            receipt = PaymentReceipt(
                payment_id=payment.id,
                receipt_number=await PaymentService._generate_receipt_number(db),
            )
            await payment_repo.create_receipt(db, receipt)

        await db.commit()
        await db.refresh(payment)
        return payment

    @staticmethod
    async def process_webhook(db: AsyncSession, payload, user_id: Optional[uuid.UUID] = None) -> Payment:
        if not payload.gateway_order_id:
            raise ValidationError(detail="gateway_order_id is required.", error_code="GATEWAY_ORDER_REQUIRED")

        payment = await payment_repo.get_by_gateway_order_id(db, payload.gateway_order_id)
        if not payment:
            raise NotFoundError(detail="Payment not found.", error_code="PAYMENT_NOT_FOUND")

        event = (payload.event or "").lower()
        if event in ["payment.captured", "payment.success", "payment_verified"]:
            verify_payload = type("VerifyPayload", (), {
                "payment_id": payment.id,
                "gateway_order_id": payment.gateway_order_id,
                "gateway_payment_id": payload.gateway_payment_id,
                "gateway_signature": "webhook_verified",
                "transaction_reference": payload.gateway_payment_id,
            })
            return await PaymentService.verify_payment(db, verify_payload, user_id=user_id)

        if event in ["payment.failed", "payment.failure"]:
            payment.status = PaymentStatus.FAILED.value
            payment.updated_by = user_id
            db.add(payment)
            await db.commit()
            await db.refresh(payment)
            return payment

        return payment

    @staticmethod
    async def get_payment(db: AsyncSession, id: uuid.UUID) -> Payment:
        payment = await payment_repo.get_active(db, id)
        if not payment:
            raise NotFoundError(detail="Payment not found.", error_code="PAYMENT_NOT_FOUND")
        return payment

    @staticmethod
    async def get_payments(
        db: AsyncSession,
        *,
        society_id: Optional[uuid.UUID] = None,
        bill_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ):
        return await payment_repo.get_multi_active(
            db,
            society_id=society_id,
            bill_id=bill_id,
            status=status,
            skip=skip,
            limit=limit,
        )

    @staticmethod
    async def get_history(db: AsyncSession, society_id: uuid.UUID, skip: int = 0, limit: int = 100):
        return await payment_repo.get_history(db, society_id=society_id, skip=skip, limit=limit)

    @staticmethod
    async def refund_payment(db: AsyncSession, data, user_id: Optional[uuid.UUID] = None) -> Payment:
        payment = await payment_repo.get_active(db, data.payment_id)
        if not payment:
            raise NotFoundError(detail="Payment not found.", error_code="PAYMENT_NOT_FOUND")

        if payment.status != PaymentStatus.SUCCESS.value:
            raise ValidationError(detail="Only successful payments can be refunded.", error_code="REFUND_NOT_ALLOWED")

        available = round(payment.amount - payment.refunded_amount, 2)
        refund_amount = round(float(data.amount if data.amount is not None else available), 2)
        if refund_amount <= 0 or refund_amount > available:
            raise ValidationError(detail="Invalid refund amount.", error_code="INVALID_REFUND_AMOUNT")

        payment.refunded_amount = round(payment.refunded_amount + refund_amount, 2)
        if payment.refunded_amount >= payment.amount:
            payment.status = PaymentStatus.REFUNDED.value
        payment.updated_by = user_id
        db.add(payment)

        bill = await bill_repo.get_active(db, payment.bill_id)
        if bill:
            bill.paid_amount = round(max(0.0, bill.paid_amount - refund_amount), 2)
            if bill.paid_amount <= 0 and datetime.now(timezone.utc).date() > bill.due_date:
                bill.status = BillStatus.OVERDUE.value
            elif bill.paid_amount <= 0:
                bill.status = BillStatus.GENERATED.value
            else:
                bill.status = BillStatus.PARTIALLY_PAID.value
            bill.updated_by = user_id
            db.add(bill)

        await db.commit()
        await db.refresh(payment)
        return payment
