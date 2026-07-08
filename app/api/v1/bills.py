import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.api.v1.societies import check_tenant_access, require_admin
from app.exceptions.custom import ValidationError
from app.models.user import User
from app.schemas.bill import (
    BillCreate,
    BillGenerateRequest,
    BillListResponse,
    BillResponse,
    BillSendResponse,
    BillUpdate,
)
from app.schemas.common import ErrorResponse, SuccessResponse
from app.services.bill import BillService

router = APIRouter(prefix="/bills", tags=["Bills"])


@router.post(
    "",
    response_model=BillResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"model": BillResponse, "description": "Bill created successfully"},
        400: {"model": ErrorResponse, "description": "Validation failed"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
    },
)
async def create_bill(
    data: BillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    check_tenant_access(current_user, data.society_id, allow_resident=False)
    return await BillService.create_bill(db, data, user_id=current_user.id)


@router.post(
    "/generate",
    response_model=List[BillResponse],
)
async def generate_bills(
    data: BillGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    check_tenant_access(current_user, data.society_id, allow_resident=False)
    return await BillService.generate_bills(db, data, user_id=current_user.id)


@router.get("", response_model=BillListResponse)
async def list_bills(
    society_id: Optional[uuid.UUID] = Query(None),
    flat_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role.name != "Super Admin":
        if not current_user.society_id:
            raise ValidationError(detail="User is not mapped to a society.", error_code="SOCIETY_REQUIRED")
        society_id = current_user.society_id

    bills = await BillService.get_bills(
        db,
        society_id=society_id,
        flat_id=flat_id,
        status=status,
        skip=skip,
        limit=limit,
    )
    return BillListResponse(items=bills, count=len(bills))


@router.get("/outstanding", response_model=BillListResponse)
async def get_outstanding(
    society_id: Optional[uuid.UUID] = Query(None),
    bill_type: Optional[str] = Query(None, description="Filter by type e.g. MAINTENANCE"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role.name != "Super Admin":
        society_id = current_user.society_id

    if not society_id:
        raise ValidationError(detail="society_id is required.", error_code="SOCIETY_ID_REQUIRED")

    check_tenant_access(current_user, society_id, allow_resident=True)
    bills = await BillService.get_outstanding(db, society_id, bill_type=bill_type)
    return BillListResponse(items=bills, count=len(bills))


@router.get("/history", response_model=BillListResponse)
async def get_history(
    society_id: Optional[uuid.UUID] = Query(None),
    flat_id: Optional[uuid.UUID] = Query(None),
    bill_type: Optional[str] = Query(None, description="Filter by type e.g. MAINTENANCE"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role.name != "Super Admin":
        society_id = current_user.society_id

    if not society_id:
        raise ValidationError(detail="society_id is required.", error_code="SOCIETY_ID_REQUIRED")

    check_tenant_access(current_user, society_id, allow_resident=True)
    bills = await BillService.get_history(
        db, society_id=society_id, flat_id=flat_id, bill_type=bill_type, skip=skip, limit=limit
    )
    return BillListResponse(items=bills, count=len(bills))


@router.get("/{id}", response_model=BillResponse)
async def get_bill(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    bill = await BillService.get_bill(db, id)
    check_tenant_access(current_user, bill.society_id, allow_resident=True)
    return bill


@router.put("/{id}", response_model=BillResponse)
async def update_bill(
    id: uuid.UUID,
    data: BillUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = await BillService.get_bill(db, id)
    check_tenant_access(current_user, existing.society_id, allow_resident=False)
    return await BillService.update_bill(db, id, data, user_id=current_user.id)


@router.delete("/{id}", response_model=SuccessResponse)
async def delete_bill(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = await BillService.get_bill(db, id)
    check_tenant_access(current_user, existing.society_id, allow_resident=False)
    await BillService.delete_bill(db, id, user_id=current_user.id)
    return SuccessResponse(message="Bill deleted successfully.")


@router.post("/{id}/send", response_model=BillSendResponse)
async def send_bill(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = await BillService.get_bill(db, id)
    check_tenant_access(current_user, existing.society_id, allow_resident=False)
    bill = await BillService.send_bill(db, id, user_id=current_user.id)
    return BillSendResponse(message="Bill marked as sent.", bill_id=bill.id)
