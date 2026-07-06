import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.custom import NotFoundError, ValidationError, ConflictError
from app.models.payment import Payment, PaymentReceipt
from app.models.bill import MaintenanceBill
from app.models.flat import Flat
from app.models.society import Society
from app.repositories.payment import PaymentRepository
from app.repositories.bill import BillRepository
from app.schemas.payment import OrderCreate, OrderResponse, PaymentVerify, PaymentRefund
from app.utils.receipt import generate_receipt_pdf_bytes
from app.services.storage import StorageService

logger = logging.getLogger(__name__)
payment_repo = PaymentRepository()
bill_repo = BillRepository()


class PaymentService:
    @staticmethod
    async def create_order(db: AsyncSession, data: OrderCreate, society_id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> OrderResponse:
        # Check if bill exists
        bill = await bill_repo.get_active(db, data.bill_id)
        if not bill or bill.society_id != society_id:
            raise NotFoundError("Bill not found.")

        if bill.status == "PAID":
            raise ValidationError("Bill is already fully paid.")

        # Simulate order creation in payment gateway
        order_id = f"ORD-{uuid.uuid4().hex[:12].upper()}"
        
        # We also create a pending Payment record to represent the initialized transaction
        prefix = f"PAY-{datetime.now(timezone.utc).strftime('%Y%m')}-"
        last_seq = await payment_repo.get_max_payment_number_sequence(db, society_id, prefix)
        payment_number = f"{prefix}{(last_seq + 1):04d}"

        payment_obj = Payment(
            society_id=society_id,
            bill_id=bill.id,
            flat_id=bill.flat_id,
            payment_number=payment_number,
            amount=bill.outstanding_amount,
            payment_method=data.payment_method,
            status="PENDING",
            transaction_reference=order_id,
            created_by=user_id,
            updated_by=user_id
        )
        await payment_repo.create(db, obj_in=payment_obj)
        await db.commit()

        return OrderResponse(
            order_id=order_id,
            amount=bill.outstanding_amount,
            bill_id=bill.id,
            status="PENDING"
        )

    @staticmethod
    async def verify_payment(db: AsyncSession, data: PaymentVerify, society_id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> Payment:
        # Check duplicate payment reference
        query_dup = select(Payment).where(
            and_(
                Payment.transaction_reference == data.transaction_reference,
                Payment.status == "COMPLETED"
            )
        )
        res_dup = await db.execute(query_dup)
        dup = res_dup.scalar_one_or_none()
        if dup:
            raise ConflictError("Duplicate payment detected: This transaction reference has already been processed.")

        # Find the pending payment by order_id/transaction_reference
        query_pending = select(Payment).where(
            and_(
                Payment.transaction_reference == data.order_id,
                Payment.society_id == society_id,
                Payment.status == "PENDING"
            )
        )
        res_pending = await db.execute(query_pending)
        payment = res_pending.scalar_one_or_none()
        if not payment:
            raise NotFoundError("Pending payment order not found.")

        # Update payment status
        payment.status = "COMPLETED"
        payment.transaction_reference = data.transaction_reference
        payment.paid_at = datetime.now(timezone.utc)
        payment.updated_by = user_id
        
        if data.amount_paid is not None:
            payment.amount = data.amount_paid

        # Fetch and update associated bill
        if payment.bill_id:
            bill = await bill_repo.get_active(db, payment.bill_id)
            if bill:
                bill.paid_amount = round(bill.paid_amount + payment.amount, 2)
                bill.outstanding_amount = max(0.0, round(bill.total_amount - bill.paid_amount, 2))
                if bill.outstanding_amount <= 0.0:
                    bill.status = "PAID"
                else:
                    bill.status = "PARTIALLY_PAID"
                bill.updated_by = user_id

        # Generate receipt
        prefix_receipt = f"REC-{datetime.now(timezone.utc).strftime('%Y%m')}-"
        # We can count existing receipts to get sequence
        query_receipt_seq = select(func.count(PaymentReceipt.id)).where(PaymentReceipt.receipt_number.like(f"{prefix_receipt}%"))
        res_seq = await db.execute(query_receipt_seq)
        last_seq = res_seq.scalar() or 0
        receipt_number = f"{prefix_receipt}{(last_seq + 1):04d}"

        # Fetch flat and society info for PDF branding
        flat = await db.scalar(select(Flat).where(Flat.id == payment.flat_id))
        society = await db.scalar(select(Society).where(Society.id == society_id))
        
        flat_number = flat.flat_number if flat else "Unknown"
        society_name = society.name if society else "HomeSync Society"
        bill_number = payment.bill.bill_number if payment.bill else "Direct Payment"

        # Generate receipt PDF bytes
        pdf_bytes = generate_receipt_pdf_bytes(
            receipt_number=receipt_number,
            amount=payment.amount,
            date_str=payment.paid_at.strftime("%Y-%m-%d %H:%M:%S"),
            flat_num=flat_number,
            bill_num=bill_number,
            society_name=society_name
        )

        # Upload receipt PDF
        pdf_url = None
        try:
            pdf_url = await StorageService.upload_profile_image(
                file_bytes=pdf_bytes,
                file_name=f"receipts/{receipt_number}.pdf",
                content_type="application/pdf"
            )
        except Exception as e:
            logger.warning(f"Failed to upload receipt PDF to StorageService: {e}")
            pdf_url = f"https://mock.supabase.co/storage/v1/object/public/receipts/{receipt_number}.pdf"

        await payment_repo.create_receipt(
            db,
            payment_id=payment.id,
            receipt_number=receipt_number,
            pdf_url=pdf_url
        )

        await db.commit()
        await db.refresh(payment)
        return payment

    @staticmethod
    async def handle_webhook(db: AsyncSession, payload: dict) -> None:
        """
        Processes payment gateway status notifications (like Razorpay/Stripe webhook events).
        """
        event = payload.get("event")
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = entity.get("order_id")
        transaction_ref = entity.get("id")
        amount = float(entity.get("amount", 0)) / 100.0 if entity.get("amount") else 0.0
        status = entity.get("status")

        if not order_id or status != "captured":
            return

        # Query pending payment
        query = select(Payment).where(and_(Payment.transaction_reference == order_id, Payment.status == "PENDING"))
        result = await db.execute(query)
        payment = result.scalar_one_or_none()
        if not payment:
            return

        # Trigger verification to complete payment
        await PaymentService.verify_payment(
            db,
            data=PaymentVerify(
                order_id=order_id,
                transaction_reference=transaction_ref,
                payment_method=payment.payment_method,
                amount_paid=amount
            ),
            society_id=payment.society_id
        )

    @staticmethod
    async def get_payment(db: AsyncSession, id: uuid.UUID, society_id: uuid.UUID) -> Payment:
        payment = await payment_repo.get_active(db, id)
        if not payment or payment.society_id != society_id:
            raise NotFoundError("Payment record not found.")
        return payment

    @staticmethod
    async def get_multi_payments(
        db: AsyncSession,
        society_id: uuid.UUID,
        flat_id: Optional[uuid.UUID] = None,
        bill_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Payment]:
        return await payment_repo.get_multi_payments(
            db,
            society_id=society_id,
            flat_id=flat_id,
            bill_id=bill_id,
            status=status,
            skip=skip,
            limit=limit
        )

    @staticmethod
    async def refund_payment(db: AsyncSession, data: PaymentRefund, society_id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> Payment:
        payment = await payment_repo.get_active(db, data.payment_id)
        if not payment or payment.society_id != society_id:
            raise NotFoundError("Payment not found.")

        if payment.status != "COMPLETED":
            raise ValidationError("Only completed payments can be refunded.")

        remaining_refundable = payment.amount - payment.refunded_amount
        if remaining_refundable <= 0:
            raise ValidationError("Payment is already fully refunded.")

        if data.amount > remaining_refundable:
            raise ValidationError(f"Cannot refund more than remaining payment balance of INR {remaining_refundable:.2f}")

        # Update refund fields on Payment
        payment.refunded_amount = round(payment.refunded_amount + data.amount, 2)
        payment.refund_reason = data.reason
        payment.status = "REFUNDED" if payment.refunded_amount == payment.amount else "COMPLETED"
        payment.updated_by = user_id

        # Update associated bill
        if payment.bill_id:
            bill = await bill_repo.get_active(db, payment.bill_id)
            if bill:
                bill.paid_amount = max(0.0, round(bill.paid_amount - data.amount, 2))
                bill.outstanding_amount = round(bill.total_amount - bill.paid_amount, 2)
                if bill.outstanding_amount >= bill.total_amount:
                    bill.status = "SENT"
                else:
                    bill.status = "PARTIALLY_PAID"
                bill.updated_by = user_id

        await db.commit()
        await db.refresh(payment)
        return payment
