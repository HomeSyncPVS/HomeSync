import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class WingBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Name of the wing (e.g., Wing A, Block B)")


class WingCreate(WingBase):
    society_id: uuid.UUID = Field(..., description="ID of the society this wing belongs to")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Wing A",
                "society_id": "00000000-0000-0000-0000-000000000000"
            }
        }
    )


class WingUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class WingResponse(WingBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID] = None
    updated_by: Optional[uuid.UUID] = None
