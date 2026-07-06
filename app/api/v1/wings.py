import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.api.v1.societies import check_tenant_access, require_admin
from app.models.user import User
from app.schemas.common import SuccessResponse, ErrorResponse
from app.schemas.wing import WingCreate, WingUpdate, WingResponse
from app.services.wing import WingService

router = APIRouter(prefix="/wings", tags=["Wings"])


@router.post(
    "",
    response_model=WingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new wing",
    description="Creates a new wing in the specified society. Admins can only create wings within their own society.",
    responses={
        201: {"model": WingResponse, "description": "Wing created successfully"},
        400: {"model": ErrorResponse, "description": "Validation failed"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        409: {"model": ErrorResponse, "description": "Wing with this name already exists in the society"}
    }
)
async def create_wing(
    data: WingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    check_tenant_access(current_user, data.society_id, allow_resident=False)
    return await WingService.create_wing(db, data, user_id=current_user.id)


@router.get(
    "",
    response_model=List[WingResponse],
    summary="List wings",
    description="Retrieves a list of wings, with optional filtration by society ID. Admins and Residents are restricted to their own society.",
    responses={
        200: {"model": List[WingResponse], "description": "List retrieved successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"}
    }
)
async def list_wings(
    society_id: Optional[uuid.UUID] = Query(None, description="Filter by society ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Enforce tenant isolation for lists
    if current_user.role.name != "Super Admin":
        society_id = current_user.society_id

    return await WingService.get_wings(db, society_id=society_id, skip=skip, limit=limit)


@router.get(
    "/{id}",
    response_model=WingResponse,
    summary="Get wing details",
    description="Retrieves information for a single wing by ID. Scoped access is enforced.",
    responses={
        200: {"model": WingResponse, "description": "Wing details retrieved successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        404: {"model": ErrorResponse, "description": "Wing not found"}
    }
)
async def get_wing(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    wing = await WingService.get_wing(db, id)
    check_tenant_access(current_user, wing.society_id, allow_resident=True)
    return wing


@router.put(
    "/{id}",
    response_model=WingResponse,
    summary="Update a wing",
    description="Updates the wing name. Scoped access is enforced.",
    responses={
        200: {"model": WingResponse, "description": "Wing updated successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        404: {"model": ErrorResponse, "description": "Wing not found"},
        409: {"model": ErrorResponse, "description": "Wing name already exists"}
    }
)
async def update_wing(
    id: uuid.UUID,
    data: WingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    wing = await WingService.get_wing(db, id)
    check_tenant_access(current_user, wing.society_id, allow_resident=False)
    return await WingService.update_wing(db, id, data, user_id=current_user.id)


@router.delete(
    "/{id}",
    response_model=SuccessResponse,
    summary="Delete a wing",
    description="Soft-deletes a wing and cascades the deletion to its floors and flats.",
    responses={
        200: {"model": SuccessResponse, "description": "Wing soft-deleted successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        404: {"model": ErrorResponse, "description": "Wing not found"}
    }
)
async def delete_wing(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    wing = await WingService.get_wing(db, id)
    check_tenant_access(current_user, wing.society_id, allow_resident=False)
    await WingService.delete_wing(db, id, user_id=current_user.id)
    return SuccessResponse(message="Wing and its cascade contents soft-deleted successfully.")
