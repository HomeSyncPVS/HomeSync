from typing import List, Dict, Any
from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_bills_generated: int
    total_bills_paid: int
    collection_percentage: float
    total_outstanding_amount: float
    late_payments_count: int
    total_revenue_collected: float


class AnalyticsRevenueItem(BaseModel):
    month: str  # YYYY-MM
    revenue: float


class AnalyticsPaymentsItem(BaseModel):
    method: str  # UPI, CASH, CHEQUE, ONLINE etc.
    count: int
    amount: float


class AnalyticsCollectionsItem(BaseModel):
    month: str
    billed_amount: float
    collected_amount: float
    collection_percentage: float


class AnalyticsOutstandingItem(BaseModel):
    wing_name: str
    outstanding_amount: float
    flats_count: int
