from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, EmailStr


class VendorBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., min_length=10, max_length=50)
    email: Optional[EmailStr] = None
    category: str = Field(..., max_length=100)
    experience: int = Field(default=0, ge=0)
    status: str = Field(default="ACTIVE", max_length=50)


class VendorCreate(VendorBase):
    society_id: uuid.UUID


class VendorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, min_length=10, max_length=50)
    email: Optional[EmailStr] = None
    category: Optional[str] = Field(None, max_length=100)
    experience: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None, max_length=50)


class VendorResponse(VendorBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    rating: float
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID] = None
    updated_by: Optional[uuid.UUID] = None


class VendorRatingCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = Field(None, max_length=1000)


class VendorRatingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    vendor_id: uuid.UUID
    user_id: uuid.UUID
    rating: int
    feedback: Optional[str] = None
    created_at: datetime
