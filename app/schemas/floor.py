import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class FloorBase(BaseModel):
    floor_number: int = Field(..., description="Floor number (e.g. 0 for Ground, 1, 2, etc.)")


class FloorCreate(FloorBase):
    wing_id: uuid.UUID = Field(..., description="ID of the wing this floor belongs to")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "floor_number": 1,
                "wing_id": "00000000-0000-0000-0000-000000000000"
            }
        }
    )


class FloorUpdate(BaseModel):
    floor_number: int = Field(..., description="Updated floor number")


class FloorResponse(FloorBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    wing_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID] = None
    updated_by: Optional[uuid.UUID] = None
