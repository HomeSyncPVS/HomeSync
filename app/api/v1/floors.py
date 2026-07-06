import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.api.v1.societies import check_tenant_access, require_admin
from app.exceptions.custom import ForbiddenError
from app.models.user import User
from app.schemas.common import SuccessResponse, ErrorResponse
from app.schemas.floor import FloorCreate, FloorUpdate, FloorResponse
from app.services.floor import FloorService
from app.services.wing import WingService

router = APIRouter(prefix="/floors", tags=["Floors"])


@router.post(
    "",
    response_model=FloorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new floor",
    description="Creates a new floor in a wing. Admins must own the society of the target wing.",
    responses={
        201: {"model": FloorResponse, "description": "Floor created successfully"},
        400: {"model": ErrorResponse, "description": "Validation failed"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        409: {"model": ErrorResponse, "description": "Floor number already exists in this wing"}
    }
)
async def create_floor(
    data: FloorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Validate tenant access using parent wing's society_id
    wing = await WingService.get_wing(db, data.wing_id)
    check_tenant_access(current_user, wing.society_id, allow_resident=False)
    
    return await FloorService.create_floor(db, data, user_id=current_user.id)


@router.get(
    "",
    response_model=List[FloorResponse],
    summary="List floors",
    description="Retrieves a list of active floors, with optional filtration by wing. Scoped access is enforced.",
    responses={
        200: {"model": List[FloorResponse], "description": "List retrieved successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"}
    }
)
async def list_floors(
    wing_id: Optional[uuid.UUID] = Query(None, description="Filter by wing ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Enforce tenant isolation
    if current_user.role.name != "Super Admin":
        if wing_id:
            wing = await WingService.get_wing(db, wing_id)
            check_tenant_access(current_user, wing.society_id, allow_resident=True)
        else:
            # If no wing_id provided, fetch floors for wings inside the user's society
            wings = await WingService.get_wings(db, society_id=current_user.society_id, limit=500)
            wing_ids = [w.id for w in wings]
            floors = []
            for w_id in wing_ids:
                w_floors = await FloorService.get_floors(db, wing_id=w_id, limit=100)
                floors.extend(w_floors)
            return floors[skip : skip + limit]

    return await FloorService.get_floors(db, wing_id=wing_id, skip=skip, limit=limit)


@router.get(
    "/{id}",
    response_model=FloorResponse,
    summary="Get floor details",
    description="Retrieves details of a floor. Scoped access is enforced.",
    responses={
        200: {"model": FloorResponse, "description": "Floor retrieved successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        404: {"model": ErrorResponse, "description": "Floor not found"}
    }
)
async def get_floor(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    floor = await FloorService.get_floor(db, id)
    wing = await WingService.get_wing(db, floor.wing_id)
    check_tenant_access(current_user, wing.society_id, allow_resident=True)
    return floor


@router.put(
    "/{id}",
    response_model=FloorResponse,
    summary="Update a floor",
    description="Updates floor details. Scoped access is enforced.",
    responses={
        200: {"model": FloorResponse, "description": "Floor updated successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        404: {"model": ErrorResponse, "description": "Floor not found"},
        409: {"model": ErrorResponse, "description": "Floor number already exists in the wing"}
    }
)
async def update_floor(
    id: uuid.UUID,
    data: FloorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    floor = await FloorService.get_floor(db, id)
    wing = await WingService.get_wing(db, floor.wing_id)
    check_tenant_access(current_user, wing.society_id, allow_resident=False)
    
    return await FloorService.update_floor(db, id, data, user_id=current_user.id)


@router.delete(
    "/{id}",
    response_model=SuccessResponse,
    summary="Delete a floor",
    description="Soft-deletes a floor and cascades deletion to all flats on it.",
    responses={
        200: {"model": SuccessResponse, "description": "Floor soft-deleted successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        404: {"model": ErrorResponse, "description": "Floor not found"}
    }
)
async def delete_floor(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    floor = await FloorService.get_floor(db, id)
    wing = await WingService.get_wing(db, floor.wing_id)
    check_tenant_access(current_user, wing.society_id, allow_resident=False)
    
    await FloorService.delete_floor(db, id, user_id=current_user.id)
    return SuccessResponse(message="Floor and its cascade contents soft-deleted successfully.")
