from typing import Dict, List
from pydantic import BaseModel


class DashboardAnalyticsResponse(BaseModel):
    total_bills: int
    paid_bills: int
    overdue_bills: int
    total_billed_amount: float
    total_collected_amount: float
    total_outstanding_amount: float


class RevenueAnalyticsPoint(BaseModel):
    period: str
    revenue: float


class RevenueAnalyticsResponse(BaseModel):
    points: List[RevenueAnalyticsPoint]


class PaymentsAnalyticsResponse(BaseModel):
    by_status: Dict[str, int]
    by_method: Dict[str, int]


class CollectionsAnalyticsResponse(BaseModel):
    billed_amount: float
    collected_amount: float
    collection_rate: float


class OutstandingAnalyticsResponse(BaseModel):
    outstanding_amount: float
    outstanding_count: int
    overdue_count: int
