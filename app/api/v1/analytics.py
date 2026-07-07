import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.exceptions.custom import ForbiddenError, ValidationError
from app.models.user import User
from app.schemas.analytics import (
    DashboardStats,
    AnalyticsRevenueItem,
    AnalyticsPaymentsItem,
    AnalyticsCollectionsItem,
    AnalyticsOutstandingItem
)
from app.services.analytics import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def require_society_admin(user: User = Depends(get_current_active_user)) -> User:
    if user.role.name not in ["Super Admin", "Society Admin"]:
        raise ForbiddenError(detail="Only Society Admin or Super Admin can perform this action.")
    return user


def get_user_society_id(user: User, query_society_id: Optional[uuid.UUID] = None) -> uuid.UUID:
    if user.role.name == "Super Admin":
        if not query_society_id:
            raise ValidationError(detail="society_id is required for Super Admin.")
        return query_society_id
    if not user.society_id:
        raise ForbiddenError(detail="Access Denied: You are not associated with any society.")
    return user.society_id


@router.get(
    "/dashboard",
    response_model=DashboardStats,
    summary="Get overall dashboard analytics statistics"
)
async def get_dashboard_stats(
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_society_admin)
):
    society_id = get_user_society_id(user, query_society_id)
    return await AnalyticsService.get_dashboard_stats(db, society_id)


@router.get(
    "/revenue",
    response_model=List[AnalyticsRevenueItem],
    summary="Get monthly revenue analytics data"
)
async def get_revenue_analytics(
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_society_admin)
):
    society_id = get_user_society_id(user, query_society_id)
    return await AnalyticsService.get_revenue_analytics(db, society_id)


@router.get(
    "/payments",
    response_model=List[AnalyticsPaymentsItem],
    summary="Get payment methods analytics breakdown"
)
async def get_payments_analytics(
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_society_admin)
):
    society_id = get_user_society_id(user, query_society_id)
    return await AnalyticsService.get_payments_analytics(db, society_id)


@router.get(
    "/collections",
    response_model=List[AnalyticsCollectionsItem],
    summary="Get collections percentage history"
)
async def get_collections_analytics(
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_society_admin)
):
    society_id = get_user_society_id(user, query_society_id)
    return await AnalyticsService.get_collections_analytics(db, society_id)


@router.get(
    "/outstanding",
    response_model=List[AnalyticsOutstandingItem],
    summary="Get outstanding amount breakdown by wings"
)
async def get_outstanding_analytics(
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_society_admin)
):
    society_id = get_user_society_id(user, query_society_id)
    return await AnalyticsService.get_outstanding_analytics(db, society_id)
