import uuid
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field


class BillingReportItem(BaseModel):
    bill_id: uuid.UUID
    bill_number: str
    society_name: str
    flat_number: str
    wing_name: str
    bill_type: str
    status: str
    total_amount: float
    outstanding_amount: float
    due_date: datetime


class PaymentReportItem(BaseModel):
    payment_id: uuid.UUID
    payment_number: str
    bill_number: Optional[str] = None
    flat_number: str
    wing_name: str
    amount: float
    payment_method: str
    status: str
    transaction_reference: Optional[str] = None
    paid_at: Optional[datetime] = None


class OutstandingReportItem(BaseModel):
    flat_id: uuid.UUID
    flat_number: str
    wing_name: str
    total_outstanding: float
    overdue_bills_count: int


class RevenueReportItem(BaseModel):
    period: str  # e.g., "2026-07"
    total_billed: float
    total_collected: float
    collection_rate: float
