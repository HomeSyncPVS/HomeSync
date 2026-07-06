from datetime import date
from typing import List
from pydantic import BaseModel


class ReportSummary(BaseModel):
    total_billed: float
    total_collected: float
    total_outstanding: float
    total_late_fee: float


class BillingReportRow(BaseModel):
    bill_number: str
    billing_period: str
    issue_date: date
    due_date: date
    total_amount: float
    paid_amount: float
    outstanding_amount: float
    status: str


class PaymentReportRow(BaseModel):
    payment_id: str
    bill_number: str
    method: str
    amount: float
    status: str
    paid_at: str


class RevenueReportRow(BaseModel):
    period: str
    revenue: float


class OutstandingReportRow(BaseModel):
    bill_number: str
    due_date: date
    total_amount: float
    paid_amount: float
    outstanding_amount: float
    status: str


class BillingReportResponse(BaseModel):
    summary: ReportSummary
    rows: List[BillingReportRow]


class PaymentReportResponse(BaseModel):
    count: int
    rows: List[PaymentReportRow]


class RevenueReportResponse(BaseModel):
    count: int
    rows: List[RevenueReportRow]


class OutstandingReportResponse(BaseModel):
    count: int
    rows: List[OutstandingReportRow]
