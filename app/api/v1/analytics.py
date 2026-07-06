import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.api.v1.societies import check_tenant_access
from app.exceptions.custom import ValidationError
from app.models.user import User
from app.schemas.analytics import (
    CollectionsAnalyticsResponse,
    DashboardAnalyticsResponse,
    OutstandingAnalyticsResponse,
    PaymentsAnalyticsResponse,
    RevenueAnalyticsResponse,
)
from app.services.analytics import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _resolve_society(current_user: User, society_id: uuid.UUID | None) -> uuid.UUID:
    if current_user.role.name != "Super Admin":
        if not current_user.society_id:
            raise ValidationError(detail="User is not mapped to a society.", error_code="SOCIETY_REQUIRED")
        return current_user.society_id
    if not society_id:
        raise ValidationError(detail="society_id is required for Super Admin.", error_code="SOCIETY_ID_REQUIRED")
    return society_id


@router.get("/dashboard", response_model=DashboardAnalyticsResponse)
async def dashboard(
    society_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_society = _resolve_society(current_user, society_id)
    check_tenant_access(current_user, target_society, allow_resident=True)
    return await AnalyticsService.get_dashboard(db, target_society)


@router.get("/revenue", response_model=RevenueAnalyticsResponse)
async def revenue(
    society_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_society = _resolve_society(current_user, society_id)
    check_tenant_access(current_user, target_society, allow_resident=True)
    return await AnalyticsService.get_revenue(db, target_society)


@router.get("/payments", response_model=PaymentsAnalyticsResponse)
async def payments(
    society_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_society = _resolve_society(current_user, society_id)
    check_tenant_access(current_user, target_society, allow_resident=True)
    return await AnalyticsService.get_payments(db, target_society)


@router.get("/collections", response_model=CollectionsAnalyticsResponse)
async def collections(
    society_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_society = _resolve_society(current_user, society_id)
    check_tenant_access(current_user, target_society, allow_resident=True)
    return await AnalyticsService.get_collections(db, target_society)


@router.get("/outstanding", response_model=OutstandingAnalyticsResponse)
async def outstanding(
    society_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_society = _resolve_society(current_user, society_id)
    check_tenant_access(current_user, target_society, allow_resident=True)
    return await AnalyticsService.get_outstanding(db, target_society)
