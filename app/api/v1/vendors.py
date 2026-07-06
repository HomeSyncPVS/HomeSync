import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user, PermissionChecker
from app.core.constants import PermissionEnum
from app.models.user import User
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorResponse, VendorRatingCreate, VendorRatingResponse
from app.services.vendor import VendorService

router = APIRouter()


@router.post("/", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    data: VendorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(PermissionEnum.MANAGE_SOCIETY.value)),
):
    """
    Register a new vendor in a society. Requires society:manage permission.
    """
    return await VendorService.create_vendor(db, data, current_user.id)


@router.get("/", response_model=List[VendorResponse])
async def list_vendors(
    society_id: uuid.UUID,
    category: Optional[str] = Query(None, description="Filter by service category"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve vendors registered for a society. Any authenticated user can view.
    """
    return await VendorService.get_vendors(db, society_id, category)


@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve vendor profile details. Any authenticated user can view.
    """
    return await VendorService.get_vendor(db, vendor_id)


@router.put("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: uuid.UUID,
    data: VendorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(PermissionEnum.MANAGE_SOCIETY.value)),
):
    """
    Update vendor details. Requires society:manage permission.
    """
    return await VendorService.update_vendor(db, vendor_id, data, current_user.id)


@router.delete("/{vendor_id}", response_model=VendorResponse)
async def delete_vendor(
    vendor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(PermissionEnum.MANAGE_SOCIETY.value)),
):
    """
    Remove/soft-delete a vendor profile. Requires society:manage permission.
    """
    return await VendorService.delete_vendor(db, vendor_id, current_user.id)


@router.post("/{vendor_id}/ratings", response_model=VendorRatingResponse, status_code=status.HTTP_201_CREATED)
async def rate_vendor(
    vendor_id: uuid.UUID,
    data: VendorRatingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add rating and feedback for a vendor. Any authenticated resident/user can rate.
    """
    return await VendorService.rate_vendor(db, vendor_id, data, current_user.id)
