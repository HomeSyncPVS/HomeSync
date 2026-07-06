import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.core.constants import BillStatus, BillType


class BillItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    quantity: int = Field(1, ge=1)
    unit_price: float = Field(0.0, ge=0.0)
    amount: Optional[float] = Field(None, ge=0.0)


class BillItemCreate(BillItemBase):
    pass


class BillItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    quantity: Optional[int] = Field(None, ge=1)
    unit_price: Optional[float] = Field(None, ge=0.0)
    amount: Optional[float] = Field(None, ge=0.0)


class BillItemResponse(BillItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    amount: float


class BillBase(BaseModel):
    bill_type: BillType = BillType.MAINTENANCE
    billing_period: str = Field(..., min_length=7, max_length=20, description="YYYY-MM recommended")
    issue_date: date
    due_date: date
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: date, info):
        issue_date = info.data.get("issue_date")
        if issue_date and v < issue_date:
            raise ValueError("due_date cannot be before issue_date")
        return v


class BillCreate(BillBase):
    society_id: uuid.UUID
    flat_id: uuid.UUID
    bill_number: Optional[str] = Field(None, max_length=50)
    items: List[BillItemCreate] = Field(default_factory=list)


class BillGenerateRequest(BillBase):
    society_id: uuid.UUID
    flat_ids: Optional[List[uuid.UUID]] = None
    items: List[BillItemCreate] = Field(default_factory=list)


class BillUpdate(BaseModel):
    due_date: Optional[date] = None
    status: Optional[BillStatus] = None
    notes: Optional[str] = Field(None, max_length=2000)
    items: Optional[List[BillItemUpdate]] = None


class BillResponse(BillBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    flat_id: uuid.UUID
    bill_number: str
    subtotal_amount: float
    late_fee_amount: float
    total_amount: float
    paid_amount: float
    status: str
    created_at: datetime
    updated_at: datetime
    items: List[BillItemResponse] = Field(default_factory=list)


class BillListResponse(BaseModel):
    items: List[BillResponse]
    count: int


class BillSendResponse(BaseModel):
    success: bool = True
    message: str
    bill_id: uuid.UUID
