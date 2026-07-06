import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator


class FlatBase(BaseModel):
    flat_number: str = Field(..., min_length=1, max_length=50, description="Flat number (e.g. 101, A-302)")
    flat_type: str = Field(..., min_length=1, max_length=50, description="Flat type (e.g., 1BHK, 2BHK, 3BHK, Penthouse)")
    flat_size: float = Field(..., gt=0.0, description="Size of the flat in square feet")
    occupancy_status: str = Field("VACANT", min_length=2, max_length=50, description="Occupancy status (e.g. VACANT, OCCUPIED_OWNER, OCCUPIED_TENANT)")

    @field_validator("occupancy_status")
    @classmethod
    def validate_occupancy(cls, v: str) -> str:
        allowed = ["VACANT", "OCCUPIED_OWNER", "OCCUPIED_TENANT", "UNDER_MAINTENANCE"]
        upper_v = v.upper().strip()
        # Allow case-insensitive input but normalize to uppercase
        if upper_v not in allowed:
            raise ValueError(f"Occupancy status must be one of: {', '.join(allowed)}")
        return upper_v


class FlatCreate(FlatBase):
    floor_id: uuid.UUID = Field(..., description="ID of the floor this flat belongs to")
    wing_id: uuid.UUID = Field(..., description="ID of the wing this flat belongs to")
    society_id: uuid.UUID = Field(..., description="ID of the society this flat belongs to")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "flat_number": "101",
                "flat_type": "2BHK",
                "flat_size": 1250.5,
                "occupancy_status": "VACANT",
                "floor_id": "00000000-0000-0000-0000-000000000000",
                "wing_id": "00000000-0000-0000-0000-000000000000",
                "society_id": "00000000-0000-0000-0000-000000000000"
            }
        }
    )


class FlatUpdate(BaseModel):
    flat_number: Optional[str] = Field(None, min_length=1, max_length=50)
    flat_type: Optional[str] = Field(None, min_length=1, max_length=50)
    flat_size: Optional[float] = Field(None, gt=0.0)
    occupancy_status: Optional[str] = Field(None, min_length=2, max_length=50)

    @field_validator("occupancy_status")
    @classmethod
    def validate_occupancy(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = ["VACANT", "OCCUPIED_OWNER", "OCCUPIED_TENANT", "UNDER_MAINTENANCE"]
            upper_v = v.upper().strip()
            if upper_v not in allowed:
                raise ValueError(f"Occupancy status must be one of: {', '.join(allowed)}")
            return upper_v
        return v


class FlatResponse(FlatBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    floor_id: uuid.UUID
    wing_id: uuid.UUID
    society_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID] = None
    updated_by: Optional[uuid.UUID] = None


class FlatImportRow(BaseModel):
    wing_name: str = Field(..., description="Name of the wing")
    floor_number: int = Field(..., description="Floor number")
    flat_number: str = Field(..., description="Flat number")
    flat_type: str = Field(..., description="Flat type (e.g. 2BHK)")
    flat_size: float = Field(..., gt=0.0, description="Size of flat in sqft")
    occupancy_status: str = Field("VACANT", description="Occupancy status")


class FlatImportResponse(BaseModel):
    success: bool = True
    message: str
    imported_count: int
