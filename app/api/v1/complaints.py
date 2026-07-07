import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate, ComplaintResponse
from app.services.complaint import ComplaintService
from app.exceptions.custom import ForbiddenError

router = APIRouter()


@router.post("/", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def raise_complaint(
    data: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Raise a new complaint ticket.
    """
    return await ComplaintService.create_complaint(db, data, current_user.id)


@router.get("/", response_model=List[ComplaintResponse])
async def list_complaints(
    society_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve complaints list. Residents only see their own tickets, while admins/committee see all.
    """
    # Check if user is admin/committee
    is_admin = current_user.role.name in ["Super Admin", "Society Admin", "Committee Member"]
    filter_user_id = None if is_admin else current_user.id

    return await ComplaintService.list_complaints(db, society_id, filter_user_id)


@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(
    complaint_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed view of a single complaint ticket.
    """
    complaint = await ComplaintService.get_complaint(db, complaint_id)

    # Check isolation: User must belong to the same society
    if current_user.society_id != complaint.society_id and current_user.role.name != "Super Admin":
        raise ForbiddenError(detail="Access denied to this ticket.")

    # Non-admin residents can only view their own complaints
    is_admin = current_user.role.name in ["Super Admin", "Society Admin", "Committee Member"]
    if not is_admin and complaint.user_id != current_user.id:
        raise ForbiddenError(detail="Access denied to this ticket.")

    return complaint


@router.put("/{complaint_id}", response_model=ComplaintResponse)
async def update_complaint(
    complaint_id: uuid.UUID,
    data: ComplaintUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update complaint details.
    """
    complaint = await ComplaintService.get_complaint(db, complaint_id)

    is_admin = current_user.role.name in ["Super Admin", "Society Admin", "Committee Member"]
    is_reporter = complaint.user_id == current_user.id

    if not is_admin and not is_reporter:
        raise ForbiddenError(detail="You do not have permission to modify this ticket.")

    # Non-admins cannot change status
    if not is_admin:
        if data.status or data.estimated_resolution_date:
            raise ForbiddenError(detail="Only committee members/admins can update status.")

    return await ComplaintService.update_complaint(db, complaint_id, data, current_user.id, is_admin=is_admin)


@router.post("/{complaint_id}/close", response_model=ComplaintResponse)
async def close_complaint(
    complaint_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Close a resolved complaint.
    """
    complaint = await ComplaintService.get_complaint(db, complaint_id)

    is_admin = current_user.role.name in ["Super Admin", "Society Admin", "Committee Member"]
    is_reporter = complaint.user_id == current_user.id

    if not is_admin and not is_reporter:
        raise ForbiddenError(detail="You do not have permission to close this ticket.")

    return await ComplaintService.close_complaint(db, complaint_id, current_user.id)




@router.delete("/{complaint_id}", response_model=ComplaintResponse)
async def delete_complaint(
    complaint_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a complaint. Only admins or the reporter can delete if status is OPEN.
    """
    complaint = await ComplaintService.get_complaint(db, complaint_id)

    is_admin = current_user.role.name in ["Super Admin", "Society Admin", "Committee Member"]
    is_reporter = complaint.user_id == current_user.id

    if not is_admin and not is_reporter:
        raise ForbiddenError(detail="You do not have permission to delete this ticket.")

    if not is_admin and complaint.status != "OPEN":
        raise ForbiddenError(detail="Residents can only delete complaints that are in the OPEN status.")

    return await ComplaintService.delete_complaint(db, complaint_id, current_user.id)
