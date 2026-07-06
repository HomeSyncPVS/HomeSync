import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class OrderCreate(BaseModel):
    bill_id: uuid.UUID = Field(..., description="The bill ID to pay")
    payment_method: str = Field(..., description="Payment method: UPI, BANK_TRANSFER, CASH, CHEQUE, ONLINE")


class OrderResponse(BaseModel):
    order_id: str = Field(..., description="Gateway or internal transaction/order ID")
    amount: float
    currency: str = "INR"
    bill_id: uuid.UUID
    status: str = "PENDING"


class PaymentVerify(BaseModel):
    order_id: str = Field(..., description="The order id returned from create-order")
    transaction_reference: str = Field(..., description="UTR, transaction ID, or gateway signature")
    payment_method: str = Field(..., description="Method used to verify")
    amount_paid: Optional[float] = Field(None, description="Actual amount paid if cash/cheque/transfer")


class PaymentRefund(BaseModel):
    payment_id: uuid.UUID = Field(..., description="ID of the completed payment to refund")
    amount: float = Field(..., ge=0.01, description="Amount to refund")
    reason: str = Field(..., min_length=5, max_length=255, description="Reason for refund")


class PaymentReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    receipt_number: str
    pdf_url: Optional[str] = None
    created_at: datetime


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    society_id: uuid.UUID
    bill_id: Optional[uuid.UUID] = None
    flat_id: uuid.UUID
    payment_number: str
    amount: float
    payment_method: str
    status: str
    transaction_reference: Optional[str] = None
    paid_at: Optional[datetime] = None
    refunded_amount: float
    refund_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    receipt: Optional[PaymentReceiptResponse] = None
