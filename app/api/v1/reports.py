import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.exceptions.custom import ForbiddenError, ValidationError
from app.models.user import User
from app.schemas.report import (
    BillingReportItem,
    PaymentReportItem,
    OutstandingReportItem,
    RevenueReportItem
)
from app.services.report import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


def require_admin_or_treasurer(user: User = Depends(get_current_active_user)) -> User:
    if user.role.name not in ["Super Admin", "Admin", "Treasurer"]:
        raise ForbiddenError(detail="Only Society Admin, Treasurer, or Super Admin can perform this action.")
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
    "/billing",
    response_model=List[BillingReportItem],
    summary="Get billing report"
)
async def get_billing_report(
    query_society_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin_or_treasurer)
):
    society_id = get_user_society_id(user, query_society_id)
    return await ReportService.get_billing_report(db, society_id)


@router.get(
    "/payments",
    response_model=List[PaymentReportItem],
    summary="Get payment report"
)
async def get_payment_report(
    query_society_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin_or_treasurer)
):
    society_id = get_user_society_id(user, query_society_id)
    return await ReportService.get_payment_report(db, society_id)


@router.get(
    "/revenue",
    response_model=List[RevenueReportItem],
    summary="Get revenue collections report"
)
async def get_revenue_report(
    query_society_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin_or_treasurer)
):
    society_id = get_user_society_id(user, query_society_id)
    return await ReportService.get_revenue_report(db, society_id)


@router.get(
    "/outstanding",
    response_model=List[OutstandingReportItem],
    summary="Get outstanding collections report"
)
async def get_outstanding_report(
    query_society_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin_or_treasurer)
):
    society_id = get_user_society_id(user, query_society_id)
    return await ReportService.get_outstanding_report(db, society_id)


@router.get(
    "/export/pdf",
    summary="Export billing report to PDF format"
)
async def export_pdf(
    query_society_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin_or_treasurer)
):
    society_id = get_user_society_id(user, query_society_id)
    pdf_bytes = await ReportService.export_pdf(db, society_id)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=billing_report.pdf"}
    )


@router.get(
    "/export/excel",
    summary="Export billing report to Excel sheet format"
)
async def export_excel(
    query_society_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin_or_treasurer)
):
    society_id = get_user_society_id(user, query_society_id)
    excel_bytes = await ReportService.export_excel(db, society_id)
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=billing_report.xlsx"}
    )


@router.get(
    "/export/csv",
    summary="Export billing report to CSV document format"
)
async def export_csv(
    query_society_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin_or_treasurer)
):
    society_id = get_user_society_id(user, query_society_id)
    csv_str = await ReportService.export_csv(db, society_id)
    
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=billing_report.csv"}
    )
