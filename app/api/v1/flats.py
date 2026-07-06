import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.api.v1.societies import check_tenant_access, require_admin
from app.exceptions.custom import ValidationError
from app.models.user import User
from app.schemas.common import SuccessResponse, ErrorResponse
from app.schemas.flat import FlatCreate, FlatUpdate, FlatResponse, FlatImportResponse
from app.services.flat import FlatService
from app.services.wing import WingService
from app.services.floor import FloorService

router = APIRouter(prefix="/flats", tags=["Flats"])


@router.post(
    "",
    response_model=FlatResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new flat",
    description="Creates a new flat in a floor. Admins must own the target society.",
    responses={
        201: {"model": FlatResponse, "description": "Flat created successfully"},
        400: {"model": ErrorResponse, "description": "Validation failed"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        409: {"model": ErrorResponse, "description": "Flat number already exists in this society"}
    }
)
async def create_flat(
    data: FlatCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    check_tenant_access(current_user, data.society_id, allow_resident=False)
    return await FlatService.create_flat(db, data, user_id=current_user.id)


@router.post(
    "/import",
    response_model=FlatImportResponse,
    summary="Import flats from CSV",
    description="Bulk imports flats from an uploaded CSV file. Auto-creates wings and floors if missing. Transactional: entire batch rolls back if any row fails validation.",
    responses={
        200: {"model": FlatImportResponse, "description": "Flats imported successfully"},
        400: {"model": ErrorResponse, "description": "Invalid CSV headers, layout, or data validations"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        409: {"model": ErrorResponse, "description": "Flat number conflict"}
    }
)
async def import_flats(
    society_id: Optional[uuid.UUID] = Query(None, description="Society to import into. Defaults to Admin's own society."),
    file: UploadFile = File(..., description="CSV file with wing_name, floor_number, flat_number, flat_type, flat_size, occupancy_status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Determine and validate target society
    target_society_id = society_id or current_user.society_id
    if not target_society_id:
        raise ValidationError(detail="society_id is required for import.", error_code="SOCIETY_ID_REQUIRED")

    check_tenant_access(current_user, target_society_id, allow_resident=False)

    # Read file content as text
    try:
        content_bytes = await file.read()
        csv_text = content_bytes.decode("utf-8")
    except Exception:
        raise ValidationError(detail="Failed to decode CSV file. Ensure it is encoded in UTF-8.", error_code="INVALID_CSV_ENCODING")

    count = await FlatService.import_flats_csv(db, target_society_id, csv_text, user_id=current_user.id)
    return FlatImportResponse(
        message=f"Successfully imported {count} flats.",
        imported_count=count
    )


@router.get(
    "/export",
    summary="Export flats to CSV",
    description="Generates and streams a CSV download of all active flats in the society.",
    responses={
        200: {"description": "CSV stream response"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        404: {"model": ErrorResponse, "description": "Society not found"}
    }
)
async def export_flats(
    society_id: Optional[uuid.UUID] = Query(None, description="Society to export. Defaults to user's society."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Determine and validate target society
    target_society_id = society_id or current_user.society_id
    if not target_society_id:
        raise ValidationError(detail="society_id is required for export.", error_code="SOCIETY_ID_REQUIRED")

    check_tenant_access(current_user, target_society_id, allow_resident=True)

    csv_data = await FlatService.export_flats_csv(db, target_society_id)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=flats_society_{target_society_id}.csv"
        }
    )


@router.get(
    "",
    response_model=List[FlatResponse],
    summary="List flats",
    description="Retrieves a list of active flats. Filters by society, wing, and floor. Scoped access is enforced.",
    responses={
        200: {"model": List[FlatResponse], "description": "List retrieved successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"}
    }
)
async def list_flats(
    society_id: Optional[uuid.UUID] = Query(None, description="Filter by society ID"),
    wing_id: Optional[uuid.UUID] = Query(None, description="Filter by wing ID"),
    floor_id: Optional[uuid.UUID] = Query(None, description="Filter by floor ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Enforce tenant isolation
    if current_user.role.name != "Super Admin":
        society_id = current_user.society_id
        # If filtering by wing or floor, verify they belong to user's society
        if wing_id:
            wing = await WingService.get_wing(db, wing_id)
            check_tenant_access(current_user, wing.society_id, allow_resident=True)
        if floor_id:
            floor = await FloorService.get_floor(db, floor_id)
            wing = await WingService.get_wing(db, floor.wing_id)
            check_tenant_access(current_user, wing.society_id, allow_resident=True)

    return await FlatService.get_flats(
        db, society_id=society_id, wing_id=wing_id, floor_id=floor_id, skip=skip, limit=limit
    )


@router.get(
    "/{id}",
    response_model=FlatResponse,
    summary="Get flat details",
    description="Retrieves details for a single flat by ID. Scoped access is enforced.",
    responses={
        200: {"model": FlatResponse, "description": "Flat details retrieved successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        404: {"model": ErrorResponse, "description": "Flat not found"}
    }
)
async def get_flat(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    flat = await FlatService.get_flat(db, id)
    check_tenant_access(current_user, flat.society_id, allow_resident=True)
    return flat


@router.put(
    "/{id}",
    response_model=FlatResponse,
    summary="Update flat details",
    description="Updates information on a flat. Admins can only update flats inside their society.",
    responses={
        200: {"model": FlatResponse, "description": "Flat updated successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        404: {"model": ErrorResponse, "description": "Flat not found"},
        409: {"model": ErrorResponse, "description": "Flat number already exists in this society"}
    }
)
async def update_flat(
    id: uuid.UUID,
    data: FlatUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    flat = await FlatService.get_flat(db, id)
    check_tenant_access(current_user, flat.society_id, allow_resident=False)
    return await FlatService.update_flat(db, id, data, user_id=current_user.id)


@router.delete(
    "/{id}",
    response_model=SuccessResponse,
    summary="Delete a flat",
    description="Soft-deletes a flat. Scoped access is enforced.",
    responses={
        200: {"model": SuccessResponse, "description": "Flat soft-deleted successfully"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden tenant scope"},
        404: {"model": ErrorResponse, "description": "Flat not found"}
    }
)
async def delete_flat(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    flat = await FlatService.get_flat(db, id)
    check_tenant_access(current_user, flat.society_id, allow_resident=False)
    await FlatService.delete_flat(db, id, user_id=current_user.id)
    return SuccessResponse(message="Flat soft-deleted successfully.")
