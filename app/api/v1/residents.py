import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status

from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_active_user
from app.api.v1.societies import require_admin, check_tenant_access
from app.models.user import User
from app.schemas.common import SuccessResponse, ErrorResponse
from app.schemas.auth import UserUpdateRequest
from app.schemas.resident import (
    ResidentResponse,
    ResidentApprovalRequest,
    ResidentDashboardResponse,
    FamilyMemberCreate,
    FamilyMemberUpdate,
    FamilyMemberResponse,
    VehicleCreate,
    VehicleUpdate,
    VehicleResponse,
    EmergencyContactCreate,
    EmergencyContactUpdate,
    EmergencyContactResponse,
    NotificationResponse,
)
from app.services.resident import ResidentService
from app.services.user import UserService
from app.repositories.user import UserRepository
from app.exceptions.custom import ForbiddenError, NotFoundError, ValidationError

router = APIRouter(prefix="/residents", tags=["Residents"])
user_repo = UserRepository()


# ==========================================
# RESIDENT CRUD & SEARCH
# ==========================================

@router.get(
    "",
    response_model=List[ResidentResponse],
    summary="Search / List residents",
    description="Retrieve a paginated list of residents in the society, with support for filtering by status, wing, floor, or search text.",
)
async def get_residents(
    search_query: Optional[str] = Query(None),
    wing_id: Optional[uuid.UUID] = Query(None),
    floor_id: Optional[uuid.UUID] = Query(None),
    approval_status: Optional[str] = Query(None),
    society_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    target_society_id = current_user.society_id
    if current_user.role.name == "Super Admin":
        if not society_id:
            raise ValidationError(detail="society_id is required for Super Admin.")
        target_society_id = society_id
    else:
        if society_id and society_id != current_user.society_id:
            raise ForbiddenError(detail="Access denied: You cannot view residents of another society.")

    residents = await ResidentService.search_residents(
        db,
        society_id=target_society_id,
        search_query=search_query,
        wing_id=wing_id,
        floor_id=floor_id,
        approval_status=approval_status,
        skip=skip,
        limit=limit,
    )
    # Serialize residents to ResidentResponse
    return [await ResidentService.get_resident_profile(db, r.id) for r in residents]


@router.get(
    "/me/profile",
    response_model=ResidentResponse,
    summary="Get own profile",
)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await ResidentService.get_resident_profile(db, current_user.id)


@router.get(
    "/me/dashboard",
    response_model=ResidentDashboardResponse,
    summary="Get own dashboard statistics",
)
async def get_my_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await ResidentService.get_dashboard_data(db, current_user)


@router.get(
    "/{resident_id}",
    response_model=ResidentResponse,
    summary="Get resident by ID",
)
async def get_resident(
    resident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role.name not in ["Super Admin", "Admin"] and current_user.id != resident_id:
        raise ForbiddenError(detail="Access denied: You can only view your own profile.")

    resident = await ResidentService.get_resident_profile(db, resident_id)
    if current_user.role.name == "Admin" and resident.society_id != current_user.society_id:
        raise ForbiddenError(detail="Access denied: Resident belongs to another society.")

    return resident


@router.put(
    "/{resident_id}",
    response_model=ResidentResponse,
    summary="Update resident details",
)
async def update_resident(
    resident_id: uuid.UUID,
    data: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role.name not in ["Super Admin", "Admin"] and current_user.id != resident_id:
        raise ForbiddenError(detail="Access denied: You can only update your own profile.")

    user = await user_repo.get(db, resident_id)
    if not user:
        raise NotFoundError(detail="Resident not found.")

    if current_user.role.name == "Admin" and user.society_id != current_user.society_id:
        raise ForbiddenError(detail="Access denied: Resident belongs to another society.")

    updated_user = await UserService.update_profile(db, user, data)
    return await ResidentService.get_resident_profile(db, updated_user.id)


@router.delete(
    "/{resident_id}",
    response_model=SuccessResponse,
    summary="Delete resident",
)
async def delete_resident(
    resident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = await user_repo.get(db, resident_id)
    if not user:
        raise NotFoundError(detail="Resident not found.")

    if current_user.role.name == "Admin" and user.society_id != current_user.society_id:
        raise ForbiddenError(detail="Access denied: Resident belongs to another society.")

    await UserService.delete_user_account(db, user)
    return SuccessResponse(message="Resident deleted successfully.")


@router.put(
    "/{resident_id}/approve",
    response_model=ResidentResponse,
    summary="Approve or Reject resident request",
)
async def approve_resident(
    resident_id: uuid.UUID,
    data: ResidentApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    resident = await user_repo.get(db, resident_id)
    if not resident:
        raise NotFoundError(detail="Resident not found.")

    if current_user.role.name == "Admin" and resident.society_id != current_user.society_id:
        raise ForbiddenError(detail="Access denied: Resident belongs to another society.")

    updated_resident = await ResidentService.approve_resident(
        db, resident_id=resident_id, status=data.status, society_id=resident.society_id
    )
    return await ResidentService.get_resident_profile(db, updated_resident.id)


# ==========================================
# FAMILY MEMBERS ENDPOINTS
# ==========================================

@router.get(
    "/me/family",
    response_model=List[FamilyMemberResponse],
    summary="Get own family members",
)
async def get_my_family_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await ResidentService.get_family_members(db, current_user.id)


@router.post(
    "/me/family",
    response_model=FamilyMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add family member",
)
async def add_my_family_member(
    data: FamilyMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await ResidentService.add_family_member(db, current_user.id, data)


@router.put(
    "/me/family/{member_id}",
    response_model=FamilyMemberResponse,
    summary="Update family member",
)
async def update_my_family_member(
    member_id: uuid.UUID,
    data: FamilyMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await ResidentService.update_family_member(db, current_user.id, member_id, data)


@router.delete(
    "/me/family/{member_id}",
    response_model=SuccessResponse,
    summary="Delete family member",
)
async def delete_my_family_member(
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await ResidentService.delete_family_member(db, current_user.id, member_id)
    return SuccessResponse(message="Family member removed successfully.")


# ==========================================
# VEHICLES ENDPOINTS
# ==========================================

@router.get(
    "/me/vehicles",
    response_model=List[VehicleResponse],
    summary="Get own vehicles",
)
async def get_my_vehicles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await ResidentService.get_vehicles(db, current_user.id)


@router.post(
    "/me/vehicles",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add vehicle",
)
async def add_my_vehicle(
    data: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await ResidentService.add_vehicle(db, current_user.id, data)


@router.put(
    "/me/vehicles/{vehicle_id}",
    response_model=VehicleResponse,
    summary="Update vehicle",
)
async def update_my_vehicle(
    vehicle_id: uuid.UUID,
    data: VehicleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await ResidentService.update_vehicle(db, current_user.id, vehicle_id, data)


@router.delete(
    "/me/vehicles/{vehicle_id}",
    response_model=SuccessResponse,
    summary="Delete vehicle",
)
async def delete_my_vehicle(
    vehicle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await ResidentService.delete_vehicle(db, current_user.id, vehicle_id)
    return SuccessResponse(message="Vehicle removed successfully.")


# ==========================================
# EMERGENCY CONTACTS ENDPOINTS
# ==========================================

@router.get(
    "/me/emergency-contacts",
    response_model=List[EmergencyContactResponse],
    summary="Get emergency contacts for society",
)
async def get_my_emergency_contacts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not current_user.society_id:
        raise ValidationError(detail="You are not associated with a society.")
    return await ResidentService.get_emergency_contacts(
        db, current_user.society_id, current_user.id
    )


@router.post(
    "/emergency-contacts",
    response_model=EmergencyContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add emergency contact (Admin only)",
)
async def add_emergency_contact(
    data: EmergencyContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if not current_user.society_id and current_user.role.name != "Super Admin":
        raise ValidationError(detail="You are not associated with a society.")
    
    # Super Admin must supply a society in the contact details (or we infer it)
    # EmergencyContact is scoped by society
    target_society_id = current_user.society_id
    if current_user.role.name == "Super Admin":
        # Check if user has society_id or if we throw error
        raise ValidationError(detail="Super Admin cannot create society-level emergency contacts directly from this endpoint without a tenant scope.")

    return await ResidentService.add_emergency_contact(db, target_society_id, data)


@router.put(
    "/emergency-contacts/{contact_id}",
    response_model=EmergencyContactResponse,
    summary="Update emergency contact (Admin only)",
)
async def update_emergency_contact(
    contact_id: uuid.UUID,
    data: EmergencyContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if not current_user.society_id and current_user.role.name != "Super Admin":
        raise ValidationError(detail="You are not associated with a society.")

    return await ResidentService.update_emergency_contact(
        db, current_user.society_id, contact_id, data
    )


@router.delete(
    "/emergency-contacts/{contact_id}",
    response_model=SuccessResponse,
    summary="Delete emergency contact (Admin only)",
)
async def delete_emergency_contact(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if not current_user.society_id and current_user.role.name != "Super Admin":
        raise ValidationError(detail="You are not associated with a society.")

    await ResidentService.delete_emergency_contact(db, current_user.society_id, contact_id)
    return SuccessResponse(message="Emergency contact deleted successfully.")


# ==========================================
# NOTIFICATIONS ENDPOINTS
# ==========================================

@router.get(
    "/me/notifications",
    response_model=List[NotificationResponse],
    summary="Get own notifications",
)
async def get_my_notifications(
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await ResidentService.get_notifications(db, current_user.id, unread_only)


@router.put(
    "/me/notifications/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark notification as read",
)
async def mark_my_notification_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await ResidentService.mark_notification_read(db, current_user.id, notification_id)
