import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
import re

# Regex for Indian Pin Code (6 digits, does not start with 0)
PINCODE_REGEX = re.compile(r"^[1-9][0-9]{5}$")

# Regex for Indian Phone Number (Allows optional +91, 10 digits starting with 6-9)
PHONE_REGEX = re.compile(r"^(?:\+91[\-\s]?)?[6-9]\d{9}$")


class SocietySettingsBase(BaseModel):
    maintenance_due_day: int = Field(5, ge=1, le=31, description="Day of the month maintenance is due")
    late_fee_percentage: float = Field(10.0, ge=0.0, le=100.0, description="Late fee percentage charged")
    allow_visitor_auto_approve: bool = Field(True, description="Enable automatic approval of visitors")
    enable_gate_pass: bool = Field(True, description="Enable gate pass generation")
    visitor_validation_required: bool = Field(True, description="Require visitor verification")
    amenity_booking_advance_days: int = Field(30, ge=1, description="Max advance booking window in days")
    emergency_contact_number: Optional[str] = Field(None, description="Society emergency contact number")

    @field_validator("emergency_contact_number")
    @classmethod
    def validate_emergency_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            if not PHONE_REGEX.match(v):
                raise ValueError("Invalid Indian phone number for emergency contact.")
        return v


class SocietySettingsUpdate(SocietySettingsBase):
    pass


class SocietySettingsResponse(SocietySettingsBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID] = None
    updated_by: Optional[uuid.UUID] = None


class SocietyBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Name of the society")
    address: Optional[str] = Field(None, max_length=512, description="Physical address")
    region: str = Field(..., min_length=2, max_length=100, description="Locality or region")
    city: str = Field(..., min_length=2, max_length=100, description="City")
    state: str = Field(..., min_length=2, max_length=100, description="State")
    pincode: str = Field(..., description="6-digit Indian PIN Code")
    phone: str = Field(..., description="Indian phone number")
    email: EmailStr = Field(..., description="Contact email address")

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: str) -> str:
        if not PINCODE_REGEX.match(v):
            raise ValueError("Invalid Indian pin code. It must be exactly 6 digits and cannot start with 0.")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not PHONE_REGEX.match(v):
            raise ValueError("Invalid Indian phone number. It must be a valid 10-digit number optionally prefixed with +91.")
        return v


class SocietyStructureCreate(BaseModel):
    num_wings: int = Field(..., ge=1, description="Number of wings to generate")
    wing_names: Optional[List[str]] = Field(None, description="Custom wing names (e.g. A, B, C)")
    floors_per_wing: int = Field(..., ge=1, description="Number of floors per wing")
    flats_per_floor: int = Field(..., ge=1, description="Number of flats per floor")
    flat_type: str = Field("2BHK", description="Default flat type")
    flat_size: float = Field(1000.0, ge=0.0, description="Default flat size in sqft")


class SocietyCreate(SocietyBase):
    structure: Optional[SocietyStructureCreate] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Greenwood Heights",
                "address": "Opposite City Park, Sector 45",
                "region": "Sector 45",
                "city": "Gurugram",
                "state": "Haryana",
                "pincode": "122003",
                "phone": "+919876543210",
                "email": "admin@greenwoodheights.com",
                "structure": {
                    "num_wings": 3,
                    "wing_names": ["A", "B", "C"],
                    "floors_per_wing": 5,
                    "flats_per_floor": 4,
                    "flat_type": "2BHK",
                    "flat_size": 1000.0
                }
            }
        }
    )


class SocietyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    address: Optional[str] = Field(None, max_length=512)
    region: Optional[str] = Field(None, min_length=2, max_length=100)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not PINCODE_REGEX.match(v):
                raise ValueError("Invalid Indian pin code. It must be exactly 6 digits and cannot start with 0.")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not PHONE_REGEX.match(v):
                raise ValueError("Invalid Indian phone number. It must be a valid 10-digit number optionally prefixed with +91.")
        return v


class SocietyResponse(SocietyBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    join_code: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID] = None
    updated_by: Optional[uuid.UUID] = None


class FlatJoinInfo(BaseModel):
    id: uuid.UUID
    flat_number: str
    flat_type: str


class FloorJoinInfo(BaseModel):
    id: uuid.UUID
    floor_number: int
    flats: List[FlatJoinInfo]


class WingJoinInfo(BaseModel):
    id: uuid.UUID
    name: str
    floors: List[FloorJoinInfo]


class SocietyJoinVerifyResponse(BaseModel):
    id: uuid.UUID
    name: str
    address: Optional[str] = None
    region: str
    city: str
    state: str
    wings: List[WingJoinInfo]
