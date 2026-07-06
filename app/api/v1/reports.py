import uuid
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.api.v1.societies import check_tenant_access
from app.exceptions.custom import ValidationError
from app.models.user import User
from app.schemas.report import (
    BillingReportResponse,
    OutstandingReportResponse,
    PaymentReportResponse,
    RevenueReportResponse,
)
from app.services.report import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


def _resolve_society(current_user: User, society_id: uuid.UUID | None) -> uuid.UUID:
    if current_user.role.name != "Super Admin":
        if not current_user.society_id:
            raise ValidationError(detail="User is not mapped to a society.", error_code="SOCIETY_REQUIRED")
        return current_user.society_id
    if not society_id:
        raise ValidationError(detail="society_id is required for Super Admin.", error_code="SOCIETY_ID_REQUIRED")
    return society_id


@router.get("/billing", response_model=BillingReportResponse)
async def billing_report(
    society_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_society = _resolve_society(current_user, society_id)
    check_tenant_access(current_user, target_society, allow_resident=True)
    return await ReportService.get_billing_report(db, target_society)


@router.get("/payments", response_model=PaymentReportResponse)
async def payments_report(
    society_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_society = _resolve_society(current_user, society_id)
    check_tenant_access(current_user, target_society, allow_resident=True)
    return await ReportService.get_payment_report(db, target_society)


@router.get("/revenue", response_model=RevenueReportResponse)
async def revenue_report(
    society_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_society = _resolve_society(current_user, society_id)
    check_tenant_access(current_user, target_society, allow_resident=True)
    return await ReportService.get_revenue_report(db, target_society)


@router.get("/outstanding", response_model=OutstandingReportResponse)
async def outstanding_report(
    society_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_society = _resolve_society(current_user, society_id)
    check_tenant_access(current_user, target_society, allow_resident=True)
    return await ReportService.get_outstanding_report(db, target_society)


@router.get("/export/pdf")
async def export_pdf(
    society_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_society = _resolve_society(current_user, society_id)
    check_tenant_access(current_user, target_society, allow_resident=True)

    payload = await ReportService.export_pdf(db, target_society)
    return Response(
        content=payload,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=billing_{target_society}.pdf"},
    )


@router.get("/export/excel")
async def export_excel(
    society_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_society = _resolve_society(current_user, society_id)
    check_tenant_access(current_user, target_society, allow_resident=True)

    payload = await ReportService.export_excel(db, target_society)
    return Response(
        content=payload,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=billing_{target_society}.xlsx"},
    )


@router.get("/export/csv")
async def export_csv(
    society_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_society = _resolve_society(current_user, society_id)
    check_tenant_access(current_user, target_society, allow_resident=True)

    payload = await ReportService.export_csv(db, target_society)
    return Response(
        content=payload,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=billing_{target_society}.csv"},
    )
