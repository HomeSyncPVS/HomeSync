import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user, PermissionChecker
from app.core.constants import PermissionEnum
from app.models.user import User
from app.schemas.notice import NoticeCreate, NoticeUpdate, NoticeResponse
from app.services.notice import NoticeService
from app.exceptions.custom import ForbiddenError

router = APIRouter()


@router.post("/", response_model=NoticeResponse, status_code=status.HTTP_201_CREATED)
async def publish_notice(
    data: NoticeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(PermissionEnum.MANAGE_SOCIETY.value)),
):
    """
    Publish a new society notice. Requires society:manage permission.
    """
    return await NoticeService.create_notice(db, data, current_user.id)


@router.get("/", response_model=List[NoticeResponse])
async def list_active_notices(
    society_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve active (non-expired) notices for a society. Any resident can view.
    """
    if current_user.society_id != society_id and current_user.role.name != "Super Admin":
        raise ForbiddenError(detail="Access denied to this society's notices.")
    return await NoticeService.get_active_notices(db, society_id)


@router.get("/archive", response_model=List[NoticeResponse])
async def list_archived_notices(
    society_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve notice archive (all notices). Any resident can view.
    """
    if current_user.society_id != society_id and current_user.role.name != "Super Admin":
        raise ForbiddenError(detail="Access denied to this society's notices.")
    return await NoticeService.get_all_notices(db, society_id)


@router.get("/{notice_id}", response_model=NoticeResponse)
async def get_notice(
    notice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed view of a single notice.
    """
    notice = await NoticeService.get_notice(db, notice_id)
    if current_user.society_id != notice.society_id and current_user.role.name != "Super Admin":
        raise ForbiddenError(detail="Access denied to this notice.")
    return notice


@router.put("/{notice_id}", response_model=NoticeResponse)
async def update_notice(
    notice_id: uuid.UUID,
    data: NoticeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(PermissionEnum.MANAGE_SOCIETY.value)),
):
    """
    Update notice details. Requires society:manage permission.
    """
    notice = await NoticeService.get_notice(db, notice_id)
    if current_user.society_id != notice.society_id and current_user.role.name != "Super Admin":
        raise ForbiddenError(detail="Access denied to this notice.")
    return await NoticeService.update_notice(db, notice_id, data, current_user.id)


@router.delete("/{notice_id}", response_model=NoticeResponse)
async def delete_notice(
    notice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(PermissionEnum.MANAGE_SOCIETY.value)),
):
    """
    Remove/soft-delete a notice. Requires society:manage permission.
    """
    notice = await NoticeService.get_notice(db, notice_id)
    if current_user.society_id != notice.society_id and current_user.role.name != "Super Admin":
        raise ForbiddenError(detail="Access denied to this notice.")
    return await NoticeService.delete_notice(db, notice_id, current_user.id)
