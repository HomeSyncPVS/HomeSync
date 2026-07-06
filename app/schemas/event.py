from datetime import datetime
from typing import Optional, List
import uuid
from pydantic import BaseModel, ConfigDict, Field


class EventRSVPResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    additional_guests: int
    created_at: datetime
    updated_at: datetime


class EventBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=10)
    date_time: datetime
    duration_minutes: int = Field(default=60, ge=5)
    location: str = Field(..., min_length=2, max_length=255)
    poster_url: Optional[str] = Field(None, max_length=512)
    rsvp_deadline: datetime
    capacity: Optional[int] = Field(None, ge=1)
    entry_fee: float = Field(default=0.0, ge=0.0)


class EventCreate(EventBase):
    society_id: uuid.UUID


class EventUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    date_time: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=5)
    location: Optional[str] = Field(None, min_length=2, max_length=255)
    poster_url: Optional[str] = Field(None, max_length=512)
    rsvp_deadline: Optional[datetime] = None
    capacity: Optional[int] = Field(None, ge=1)
    entry_fee: Optional[float] = Field(None, ge=0.0)


class EventResponse(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID] = None
    rsvps: List[EventRSVPResponse] = []


class EventRSVPCreate(BaseModel):
    status: str = Field(..., description="Attending, Not Attending, May Be")
    additional_guests: int = Field(default=0, ge=0)
