import uuid
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.bill import MaintenanceBill
from app.api.deps import get_db, get_current_active_user
from app.exceptions.custom import ForbiddenError, ValidationError
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.bill import BillCreate, BillUpdate, BillResponse, BulkBillGenerate
from app.services.bill import BillService

router = APIRouter(prefix="/bills", tags=["Maintenance Bills"])


def require_society_admin(user: User = Depends(get_current_active_user)) -> User:
    if user.role.name not in ["Super Admin", "Society Admin"]:
        raise ForbiddenError(detail="Only Society Admin or Super Admin can perform this action.")
    return user


def get_user_society_id(user: User, query_society_id: Optional[uuid.UUID] = None) -> Optional[uuid.UUID]:
    if user.role.name == "Super Admin":
        return query_society_id
    if not user.society_id:
        raise ForbiddenError(detail="Access Denied: You are not associated with any society.")
    return user.society_id


@router.post(
    "",
    response_model=BillResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new maintenance bill"
)
async def create_bill(
    data: BillCreate,
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id", description="Society ID for Super Admin"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_society_admin)
):
    society_id = get_user_society_id(user, query_society_id)
    return await BillService.create_bill(db, data, society_id, user_id=user.id)


@router.post(
    "/generate",
    response_model=SuccessResponse,
    summary="Bulk generate maintenance bills for all flats"
)
async def bulk_generate_bills(
    data: BulkBillGenerate,
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id", description="Society ID for Super Admin"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_society_admin)
):
    society_id = get_user_society_id(user, query_society_id)
    count = await BillService.bulk_generate_bills(db, data, society_id, user_id=user.id)
    return SuccessResponse(message=f"Successfully generated {count} bills in draft mode.")

@router.get(
    "",
    response_model=List[BillResponse],
    summary="Get all bills (filtered)"
)
async def get_bills(
    flat_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    bill_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    society_id = get_user_society_id(user, query_society_id)
    return await BillService.get_multi_bills(
        db,
        society_id=society_id,
        flat_id=flat_id,
        status=status,
        bill_type=bill_type,
        skip=skip,
        limit=limit
    )


@router.get(
    "/outstanding",
    response_model=List[BillResponse],
    summary="Get outstanding bills"
)
async def get_outstanding_bills(
    flat_id: Optional[uuid.UUID] = None,
    bill_type: Optional[str] = Query(None, description="Filter by bill type"),
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    society_id = get_user_society_id(user, query_society_id)
    return await BillService.get_multi_bills(
        db,
        society_id=society_id,
        flat_id=flat_id,
        status="OVERDUE", # outstanding is unpaid/overdue/partially_paid. Let's return overdue and sent/partially_paid
        bill_type=bill_type,
        skip=0,
        limit=100
    )


@router.get(
    "/history",
    response_model=List[BillResponse],
    summary="Get bills history"
)
async def get_bills_history(
    flat_id: Optional[uuid.UUID] = None,
    bill_type: Optional[str] = Query(None, description="Filter by bill type"),
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    society_id = get_user_society_id(user, query_society_id)
    # Bill history shows sent, paid, overdue, cancelled bills (status != DRAFT)
    bills = await BillService.get_multi_bills(
        db,
        society_id=society_id,
        flat_id=flat_id,
        bill_type=bill_type,
        skip=skip,
        limit=limit
    )
    return [b for b in bills if b.status != "DRAFT"]


@router.get(
    "/{id}",
    response_model=BillResponse,
    summary="Get details of a single bill"
)
async def get_bill(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    from app.exceptions.custom import NotFoundError
    query = select(MaintenanceBill).where(and_(MaintenanceBill.id == id, MaintenanceBill.deleted_at.is_(None)))
    result = await db.execute(query)
    bill = result.scalar_one_or_none()
    if not bill:
        raise NotFoundError("Bill not found.")
    
    society_id = get_user_society_id(user, query_society_id=bill.society_id)
    if bill.society_id != society_id:
        raise ForbiddenError(detail="Access Denied: You do not belong to this society.")
    return bill


@router.put(
    "/{id}",
    response_model=BillResponse,
    summary="Update a bill"
)
async def update_bill(
    id: uuid.UUID,
    data: BillUpdate,
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id", description="Society ID for Super Admin"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_society_admin)
):
    society_id = get_user_society_id(user, query_society_id)
    return await BillService.update_bill(db, id, data, society_id, user_id=user.id)


@router.delete(
    "/{id}",
    response_model=SuccessResponse,
    summary="Delete/Cancel a bill"
)
async def delete_bill(
    id: uuid.UUID,
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id", description="Society ID for Super Admin"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_society_admin)
):
    society_id = get_user_society_id(user, query_society_id)
    await BillService.delete_bill(db, id, society_id)
    return SuccessResponse(message="Bill deleted successfully.")


@router.post(
    "/{id}/send",
    response_model=BillResponse,
    summary="Send a draft bill"
)
async def send_bill(
    id: uuid.UUID,
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id", description="Society ID for Super Admin"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_society_admin)
):
    society_id = get_user_society_id(user, query_society_id)
    return await BillService.send_bill(db, id, society_id, user_id=user.id)


@router.post(
    "/trigger-late-fees",
    response_model=SuccessResponse,
    summary="Manually trigger late fees scan"
)
async def trigger_late_fees(
    query_society_id: Optional[uuid.UUID] = Query(None, alias="society_id", description="Society ID for Super Admin"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_society_admin)
):
    society_id = get_user_society_id(user, query_society_id)
    count = await BillService.apply_late_fees_if_overdue(db, society_id)
    return SuccessResponse(message=f"Late fees scan completed. Applied late fees to {count} overdue bills.")
