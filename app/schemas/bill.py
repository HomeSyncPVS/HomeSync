import uuid
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class BillItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Name of the charge (e.g. Maintenance, Water)")
    amount: float = Field(..., ge=0.0, description="Amount for this line item")


class BillItemCreate(BillItemBase):
    pass


class BillItemResponse(BillItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    bill_id: uuid.UUID


class BillBase(BaseModel):
    bill_type: str = Field(..., description="Billing frequency: MONTHLY, QUARTERLY, ANNUAL, ONE_TIME")
    due_date: datetime = Field(..., description="Due date for payment")
    billing_period_start: date = Field(..., description="Start date of billing period")
    billing_period_end: date = Field(..., description="End date of billing period")


class BillCreate(BillBase):
    flat_id: uuid.UUID = Field(..., description="Flat ID to bill")
    items: List[BillItemCreate] = Field(..., min_length=1, description="List of line items")


class BillUpdate(BaseModel):
    status: Optional[str] = Field(None, description="UNPAID, PAID, PARTIALLY_PAID, OVERDUE, CANCELLED")
    due_date: Optional[datetime] = None
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    late_fee: Optional[float] = Field(None, ge=0.0)


class BillResponse(BillBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    society_id: uuid.UUID
    flat_id: uuid.UUID
    bill_number: str
    status: str
    subtotal: float
    late_fee: float
    total_amount: float
    paid_amount: float
    outstanding_amount: float
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID] = None
    updated_by: Optional[uuid.UUID] = None
    items: List[BillItemResponse] = []


class BulkBillGenerate(BaseModel):
    bill_type: str = Field(..., description="MONTHLY, QUARTERLY, ANNUAL")
    billing_period_start: date = Field(..., description="Start of billing period")
    billing_period_end: date = Field(..., description="End of billing period")
    due_date: datetime = Field(..., description="Payment due date")
    fixed_amount: float = Field(..., ge=0.0, description="Base maintenance amount per flat")
    item_name: str = Field("Base Maintenance Charge", description="Name of the main charge item")
