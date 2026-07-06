from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class NoticeBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    content: str = Field(..., min_length=10)
    notice_type: str = Field(default="General", max_length=50)
    target_group: str = Field(default="All", max_length=100)
    attachment_url: Optional[str] = Field(None, max_length=512)
    expires_at: Optional[datetime] = None


class NoticeCreate(NoticeBase):
    society_id: uuid.UUID


class NoticeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    content: Optional[str] = Field(None, min_length=10)
    notice_type: Optional[str] = Field(None, max_length=50)
    target_group: Optional[str] = Field(None, max_length=100)
    attachment_url: Optional[str] = Field(None, max_length=512)
    expires_at: Optional[datetime] = None


class NoticeResponse(NoticeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID] = None
    updated_by: Optional[uuid.UUID] = None
