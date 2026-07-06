import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api.deps import get_db, get_current_active_user
from app.exceptions.custom import ForbiddenError, ValidationError, NotFoundError
from app.models.user import User
from app.models.payment import Payment
from app.schemas.common import SuccessResponse
from app.schemas.payment import (
    OrderCreate,
    OrderResponse,
    PaymentVerify,
    PaymentResponse,
    PaymentRefund
)
from app.services.payment import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


def require_admin_or_treasurer(user: User = Depends(get_current_active_user)) -> User:
    if user.role.name not in ["Super Admin", "Admin", "Treasurer"]:
        raise ForbiddenError(detail="Only Society Admin, Treasurer, or Super Admin can perform this action.")
    return user


def get_user_society_id(user: User, query_society_id: Optional[uuid.UUID] = None) -> uuid.UUID:
    if user.role.name == "Super Admin":
        if not query_society_id:
            raise ValidationError(detail="society_id is required for Super Admin.")
        return query_society_id
    if not user.society_id:
        raise ForbiddenError(detail="Access Denied: You are not associated with any society.")
    return user.society_id


@router.post(
    "/create-order",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initialize an online payment order"
)
async def create_order(
    data: OrderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    # Only residents or admins of the society can initialize payment
    society_id = get_user_society_id(user)
    return await PaymentService.create_order(db, data, society_id, user_id=user.id)


@router.post(
    "/verify",
    response_model=PaymentResponse,
    summary="Verify transaction payment status"
)
async def verify_payment(
    data: PaymentVerify,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    society_id = get_user_society_id(user)
    return await PaymentService.verify_payment(db, data, society_id, user_id=user.id)


@router.post(
    "/webhook",
    response_model=SuccessResponse,
    summary="Webhook receiver for payment gateway events"
)
async def payment_webhook(
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    await PaymentService.handle_webhook(db, payload)
    return SuccessResponse(message="Webhook processed successfully.")


@router.get(
    "",
    response_model=List[PaymentResponse],
    summary="List payments"
)
async def get_payments(
    flat_id: Optional[uuid.UUID] = None,
    bill_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    query_society_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    society_id = get_user_society_id(user, query_society_id)
    return await PaymentService.get_multi_payments(
        db,
        society_id=society_id,
        flat_id=flat_id,
        bill_id=bill_id,
        status=status,
        skip=skip,
        limit=limit
    )


@router.get(
    "/history",
    response_model=List[PaymentResponse],
    summary="Get payment history"
)
async def get_payment_history(
    flat_id: Optional[uuid.UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    query_society_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    society_id = get_user_society_id(user, query_society_id)
    # Payment history includes completed or refunded transactions
    payments = await PaymentService.get_multi_payments(
        db,
        society_id=society_id,
        flat_id=flat_id,
        skip=skip,
        limit=limit
    )
    return [p for p in payments if p.status in ["COMPLETED", "REFUNDED"]]


@router.get(
    "/{id}",
    response_model=PaymentResponse,
    summary="Get details of a single payment"
)
async def get_payment(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    # Fetch details and perform tenant check
    query = select(Payment).where(and_(Payment.id == id, Payment.deleted_at.is_(None)))
    result = await db.execute(query)
    payment = result.scalar_one_or_none()
    if not payment:
        raise NotFoundError("Payment not found.")

    society_id = get_user_society_id(user, query_society_id=payment.society_id)
    if payment.society_id != society_id:
        raise ForbiddenError(detail="Access Denied: You do not belong to this society.")
        
    return await PaymentService.get_payment(db, id, society_id)


@router.post(
    "/refund",
    response_model=PaymentResponse,
    summary="Process a payment refund"
)
async def refund_payment(
    data: PaymentRefund,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin_or_treasurer)
):
    society_id = get_user_society_id(user)
    return await PaymentService.refund_payment(db, data, society_id, user_id=user.id)
