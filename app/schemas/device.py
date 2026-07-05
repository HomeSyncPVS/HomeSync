from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class DeviceRegisterRequest(BaseModel):
    push_token: Optional[str] = None
    device_type: str = Field(..., examples=["ios", "android", "web"])
    os_version: Optional[str] = None
    device_model: Optional[str] = None


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    push_token: Optional[str] = None
    device_type: str
    os_version: Optional[str] = None
    device_model: Optional[str] = None
    is_active: bool
    created_at: datetime
