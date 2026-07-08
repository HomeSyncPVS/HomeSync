import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.api.v1.societies import check_tenant_access, require_admin
from app.exceptions.custom import ValidationError
from app.models.user import User
from app.schemas.payment import (
    PaymentCreateOrderRequest,
    PaymentCreateOrderResponse,
    PaymentListResponse,
    PaymentRefundRequest,
    PaymentResponse,
    PaymentVerifyRequest,
    PaymentWebhookRequest,
)
from app.services.bill import BillService
from app.services.payment import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create-order", response_model=PaymentCreateOrderResponse)
async def create_order(
    data: PaymentCreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    bill = await BillService.get_bill(db, data.bill_id)
    check_tenant_access(current_user, bill.society_id, allow_resident=True)
    payment = await PaymentService.create_order(db, data, user_id=current_user.id)
    return PaymentCreateOrderResponse(
        payment_id=payment.id,
        gateway_order_id=payment.gateway_order_id or "",
        amount=payment.amount,
    )


@router.post("/verify", response_model=PaymentResponse)
async def verify_payment(
    data: PaymentVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    payment = await PaymentService.verify_payment(db, data, user_id=current_user.id)
    check_tenant_access(current_user, payment.society_id, allow_resident=True)
    return payment


@router.post("/webhook", response_model=PaymentResponse)
async def payment_webhook(
    data: PaymentWebhookRequest,
    db: AsyncSession = Depends(get_db),
):
    payment = await PaymentService.process_webhook(db, data)
    return payment


@router.get("", response_model=PaymentListResponse)
async def list_payments(
    society_id: Optional[uuid.UUID] = Query(None),
    bill_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role.name != "Super Admin":
        society_id = current_user.society_id

    payments = await PaymentService.get_payments(
        db,
        society_id=society_id,
        bill_id=bill_id,
        status=status,
        skip=skip,
        limit=limit,
    )
    return PaymentListResponse(items=payments, count=len(payments))


@router.get("/history", response_model=PaymentListResponse)
async def payment_history(
    society_id: Optional[uuid.UUID] = Query(None),
    bill_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role.name != "Super Admin":
        society_id = current_user.society_id

    if not society_id:
        raise ValidationError(detail="society_id is required.", error_code="SOCIETY_ID_REQUIRED")

    check_tenant_access(current_user, society_id, allow_resident=True)
    payments = await PaymentService.get_history(
        db, society_id=society_id, bill_id=bill_id, status=status, skip=skip, limit=limit
    )
    return PaymentListResponse(items=payments, count=len(payments))


@router.get("/{id}", response_model=PaymentResponse)
async def get_payment(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    payment = await PaymentService.get_payment(db, id)
    check_tenant_access(current_user, payment.society_id, allow_resident=True)
    return payment


@router.post("/refund", response_model=PaymentResponse)
async def refund_payment(
    data: PaymentRefundRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    payment = await PaymentService.refund_payment(db, data, user_id=current_user.id)
    check_tenant_access(current_user, payment.society_id, allow_resident=False)
    return payment
