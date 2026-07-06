import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field
from app.core.constants import PaymentMethod, PaymentStatus


class PaymentCreateOrderRequest(BaseModel):
    bill_id: uuid.UUID
    amount: Optional[float] = Field(None, gt=0.0)
    method: PaymentMethod = PaymentMethod.ONLINE_GATEWAY


class PaymentVerifyRequest(BaseModel):
    payment_id: Optional[uuid.UUID] = None
    gateway_order_id: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    gateway_signature: Optional[str] = None
    transaction_reference: Optional[str] = None


class PaymentWebhookRequest(BaseModel):
    event: str
    gateway_order_id: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    amount: Optional[float] = None
    payload: Optional[Dict[str, Any]] = None


class PaymentRefundRequest(BaseModel):
    payment_id: uuid.UUID
    amount: Optional[float] = Field(None, gt=0.0)
    reason: Optional[str] = Field(None, max_length=500)


class PaymentReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    payment_id: uuid.UUID
    receipt_number: str
    receipt_url: Optional[str] = None
    issued_at: datetime


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    bill_id: uuid.UUID
    society_id: uuid.UUID
    amount: float
    method: str
    status: str
    gateway_order_id: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    transaction_reference: Optional[str] = None
    refunded_amount: float
    paid_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    receipt: Optional[PaymentReceiptResponse] = None


class PaymentCreateOrderResponse(BaseModel):
    success: bool = True
    payment_id: uuid.UUID
    gateway_order_id: str
    amount: float
    currency: str = "INR"
    status: PaymentStatus = PaymentStatus.CREATED


class PaymentListResponse(BaseModel):
    items: List[PaymentResponse]
    count: int
