from datetime import datetime
from typing import Optional, List
import uuid
from pydantic import BaseModel, ConfigDict, Field


class ComplaintAttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    complaint_id: uuid.UUID
    file_url: str
    file_type: str
    created_at: datetime


class ComplaintBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    category: str = Field(..., max_length=100)
    priority: str = Field(default="MEDIUM", max_length=50)
    location: Optional[str] = Field(None, max_length=255)


class ComplaintCreate(ComplaintBase):
    society_id: uuid.UUID
    attachment_urls: Optional[List[str]] = Field(default_factory=list)


class ComplaintUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    category: Optional[str] = Field(None, max_length=100)
    priority: Optional[str] = Field(None, max_length=50)
    status: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=255)
    estimated_resolution_date: Optional[datetime] = None


class ComplaintResponse(ComplaintBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    complaint_number: str
    society_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    estimated_resolution_date: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    attachments: List[ComplaintAttachmentResponse] = []
