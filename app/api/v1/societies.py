import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.exceptions.custom import ForbiddenError, ValidationError
from app.models.user import User
from app.schemas.common import SuccessResponse, ErrorResponse
from app.schemas.society import (
    SocietyCreate,
    SocietyUpdate,
    SocietyResponse,
    SocietySettingsResponse,
    SocietySettingsUpdate
)
from app.services.society import SocietyService

router = APIRouter(prefix="/societies", tags=["Societies"])


def check_tenant_access(user: User, society_id: uuid.UUID, allow_resident: bool = False):
    """
    Enforces tenant isolation:
    - Super Admin bypasses all checks.
    - Admin (Society Admin) can only manage their own society.
    - Resident (if allowed) can read only their own society.
    """
    if user.role.name == "Super Admin":
        return
    
    if user.role.name == "Admin":
        if user.society_id != society_id:
            raise ForbiddenError(detail="Access denied: You do not belong to this society.")
        return

    if allow_resident and user.role.name in ["Resident", "Staff"]:
        if user.society_id != society_id:
            raise ForbiddenError(detail="Access denied: You do not belong to this society.")
        return

    raise ForbiddenError(detail="Access denied: Insufficient privileges.")


def require_admin(user: User = Depends(get_current_active_user)) -> User:
    """
    Checks that the user is either Admin or Super Admin.
    """
    if user.role.name not in ["Super Admin", "Admin"]:
        raise ForbiddenError(detail="Only Society Admin and Super Admin can perform this action.")
    return user


# ====================================================
# SOCIETY CRUD
# ====================================================

@router.post(
    "",
    response_model=SocietyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new society",
    description="Creates a new society and automatically initializes default settings for it. Requires Admin or Super Admin privileges.",
    responses={
        201: {"model": SocietyResponse, "description": "Society created successfully"},
        400: {"model": ErrorResponse, "description": "Invalid input data"},
        401: {"model": ErrorResponse, "description": "Unauthorized access token"},
        403: {"model": ErrorResponse, "description": "Forbidden permission"},
        409: {"model": ErrorResponse, "description": "Society already exists within this region"}
    }
)
async def create_society(
    data: SocietyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return await SocietyService.create_society(db, data, user_id=current_user.id)


@router.get(
    "",
    response_model=List[SocietyResponse],
    summary="List active societies",
    description="Retrieves a paginated list of all active societies. Non-Super Admins are restricted to viewing only their own society.",
    responses={
        200: {"model": List[SocietyResponse], "description": "List retrieved successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized access token"}
    }
)
async def list_societies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by name or region"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Enforce tenant isolation for list queries
    if current_user.role.name != "Super Admin":
        if current_user.society_id:
            society = await SocietyService.get_society(db, current_user.society_id)
            return [society]
        return []
    return await SocietyService.get_societies(db, skip=skip, limit=limit, search=search)


@router.get(
    "/{id}",
    response_model=SocietyResponse,
    summary="Get society details",
    description="Retrieves details for a single active society by ID. Multi-tenancy isolation is enforced.",
    responses={
        200: {"model": SocietyResponse, "description": "Society details retrieved successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized access token"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        404: {"model": ErrorResponse, "description": "Society not found"}
    }
)
async def get_society(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    check_tenant_access(current_user, id, allow_resident=True)
    return await SocietyService.get_society(db, id)


@router.put(
    "/{id}",
    response_model=SocietyResponse,
    summary="Update society details",
    description="Updates fields on an existing active society. Admins can only update their own society.",
    responses={
        200: {"model": SocietyResponse, "description": "Society updated successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized access token"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        404: {"model": ErrorResponse, "description": "Society not found"},
        409: {"model": ErrorResponse, "description": "Conflict: name already exists within the target region"}
    }
)
async def update_society(
    id: uuid.UUID,
    data: SocietyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    check_tenant_access(current_user, id, allow_resident=False)
    return await SocietyService.update_society(db, id, data, user_id=current_user.id)


@router.delete(
    "/{id}",
    response_model=SuccessResponse,
    summary="Delete a society",
    description="Soft-deletes a society and its settings. Requires Admin or Super Admin privileges.",
    responses={
        200: {"model": SuccessResponse, "description": "Society soft-deleted successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized access token"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        404: {"model": ErrorResponse, "description": "Society not found"}
    }
)
async def delete_society(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    check_tenant_access(current_user, id, allow_resident=False)
    await SocietyService.delete_society(db, id, user_id=current_user.id)
    return SuccessResponse(message="Society soft-deleted successfully.")


# ====================================================
# SOCIETY SETTINGS
# ====================================================

@router.get(
    "/{id}/settings",
    response_model=SocietySettingsResponse,
    summary="Get society settings",
    description="Retrieves the configuration settings for a specific active society.",
    responses={
        200: {"model": SocietySettingsResponse, "description": "Settings retrieved successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        404: {"model": ErrorResponse, "description": "Settings not found"}
    }
)
async def get_society_settings(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    check_tenant_access(current_user, id, allow_resident=True)
    return await SocietyService.get_society_settings(db, id)


@router.put(
    "/{id}/settings",
    response_model=SocietySettingsResponse,
    summary="Update society settings",
    description="Updates configuration parameters on the society settings block.",
    responses={
        200: {"model": SocietySettingsResponse, "description": "Settings updated successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        404: {"model": ErrorResponse, "description": "Settings not found"}
    }
)
async def update_society_settings(
    id: uuid.UUID,
    data: SocietySettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    check_tenant_access(current_user, id, allow_resident=False)
    return await SocietyService.update_society_settings(db, id, data, user_id=current_user.id)


# ====================================================
# SOCIETY BRANDING (LOGO/BANNER)
# ====================================================

@router.post(
    "/{id}/logo",
    response_model=SocietyResponse,
    summary="Upload society logo",
    description="Uploads a new logo image (JPEG, PNG, WebP; max 5MB) for the society to storage.",
    responses={
        200: {"model": SocietyResponse, "description": "Logo uploaded successfully"},
        400: {"model": ErrorResponse, "description": "Invalid file format or file too large"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        404: {"model": ErrorResponse, "description": "Society not found"}
    }
)
async def upload_logo(
    id: uuid.UUID,
    file: UploadFile = File(..., description="Logo image file"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    check_tenant_access(current_user, id, allow_resident=False)
    return await SocietyService.upload_branding_asset(db, id, file, is_logo=True, user_id=current_user.id)


@router.post(
    "/{id}/banner",
    response_model=SocietyResponse,
    summary="Upload society banner",
    description="Uploads a new banner image (JPEG, PNG, WebP; max 5MB) for the society to storage.",
    responses={
        200: {"model": SocietyResponse, "description": "Banner uploaded successfully"},
        400: {"model": ErrorResponse, "description": "Invalid file format or file too large"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        404: {"model": ErrorResponse, "description": "Society not found"}
    }
)
async def upload_banner(
    id: uuid.UUID,
    file: UploadFile = File(..., description="Banner image file"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    check_tenant_access(current_user, id, allow_resident=False)
    return await SocietyService.upload_branding_asset(db, id, file, is_logo=False, user_id=current_user.id)


@router.delete(
    "/{id}/logo",
    response_model=SocietyResponse,
    summary="Delete society logo",
    description="Deletes the current logo image from storage and clears the society's logo URL.",
    responses={
        200: {"model": SocietyResponse, "description": "Logo deleted successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        404: {"model": ErrorResponse, "description": "Society not found or logo doesn't exist"}
    }
)
async def delete_logo(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    check_tenant_access(current_user, id, allow_resident=False)
    return await SocietyService.delete_branding_asset(db, id, is_logo=True, user_id=current_user.id)


@router.delete(
    "/{id}/banner",
    response_model=SocietyResponse,
    summary="Delete society banner",
    description="Deletes the current banner image from storage and clears the society's banner URL.",
    responses={
        200: {"model": SocietyResponse, "description": "Banner deleted successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        404: {"model": ErrorResponse, "description": "Society not found or banner doesn't exist"}
    }
)
async def delete_banner(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    check_tenant_access(current_user, id, allow_resident=False)
    return await SocietyService.delete_branding_asset(db, id, is_logo=False, user_id=current_user.id)
