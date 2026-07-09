import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator


# ==========================================
# FAMILY MEMBERS SCHEMAS
# ==========================================

class FamilyMemberBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    relationship: str = Field(..., min_length=2, max_length=50)
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    email: Optional[EmailStr] = None


class FamilyMemberCreate(FamilyMemberBase):
    pass


class FamilyMemberUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    relationship: Optional[str] = Field(None, min_length=2, max_length=50)
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    email: Optional[EmailStr] = None


class FamilyMemberResponse(FamilyMemberBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ==========================================
# VEHICLE SCHEMAS
# ==========================================

class VehicleBase(BaseModel):
    vehicle_number: str = Field(..., min_length=3, max_length=50, description="e.g. MH12AB1234")
    vehicle_type: str = Field(..., description="TWO_WHEELER or FOUR_WHEELER")
    make_model: Optional[str] = Field(None, max_length=100)
    parking_slot: Optional[str] = Field(None, max_length=50)


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    vehicle_number: Optional[str] = Field(None, min_length=3, max_length=50)
    vehicle_type: Optional[str] = None
    make_model: Optional[str] = Field(None, max_length=100)
    parking_slot: Optional[str] = Field(None, max_length=50)


class VehicleResponse(VehicleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ==========================================
# EMERGENCY CONTACT SCHEMAS
# ==========================================

class EmergencyContactBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    role_or_service: str = Field(..., min_length=2, max_length=100, description="e.g. Security, Plumber, Fire Station")
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")
    email: Optional[EmailStr] = None


class EmergencyContactCreate(EmergencyContactBase):
    user_id: Optional[uuid.UUID] = None


class EmergencyContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    role_or_service: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    email: Optional[EmailStr] = None


class EmergencyContactResponse(EmergencyContactBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime


# ==========================================
# NOTIFICATION SCHEMAS
# ==========================================

class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    body: str
    notification_type: str
    read_at: Optional[datetime] = None
    created_at: datetime


# ==========================================
# RESIDENT / APPROVAL SCHEMAS
# ==========================================

class ResidentApprovalRequest(BaseModel):
    status: str = Field(..., description="APPROVED or REJECTED")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = ["APPROVED", "REJECTED"]
        upper_v = v.upper().strip()
        if upper_v not in allowed:
            raise ValueError("Status must be either APPROVED or REJECTED")
        return upper_v


class WingBriefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str


class FloorBriefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    floor_number: int
    wing: Optional[WingBriefResponse] = None


class FlatBriefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    flat_number: str
    flat_type: str
    occupancy_status: str
    floor: Optional[FloorBriefResponse] = None


class SocietyBriefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    city: str


class ResidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    phone: Optional[str] = None
    full_name: str
    role_id: uuid.UUID
    society_id: Optional[uuid.UUID] = None
    flat_id: Optional[uuid.UUID] = None
    profile_image_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    approval_status: str
    created_at: datetime

    flat: Optional[FlatBriefResponse] = None
    society: Optional[SocietyBriefResponse] = None
    family_members: List[FamilyMemberResponse] = []
    vehicles: List[VehicleResponse] = []


class ResidentDashboardResponse(BaseModel):
    unpaid_bills_count: int
    unpaid_bills_amount: float
    active_complaints_count: int
    recent_notices_count: int
    upcoming_events_count: int
