import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user, PermissionChecker
from app.core.constants import PermissionEnum
from app.models.user import User
from app.schemas.event import EventCreate, EventUpdate, EventResponse, EventRSVPCreate, EventRSVPResponse
from app.services.event import EventService
from app.exceptions.custom import ForbiddenError

router = APIRouter()


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(PermissionEnum.MANAGE_SOCIETY.value)),
):
    """
    Create a new society event. Requires society:manage permission.
    """
    return await EventService.create_event(db, data, current_user.id)


@router.get("/", response_model=List[EventResponse])
async def list_events(
    society_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all active events for a society. Any resident can view.
    """
    if current_user.society_id != society_id and current_user.role.name != "Super Admin":
        raise ForbiddenError(detail="Access denied to this society's events.")
    return await EventService.get_events(db, society_id)


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve single event details with RSVP status list. Any resident can view.
    """
    event = await EventService.get_event(db, event_id)
    if current_user.society_id != event.society_id and current_user.role.name != "Super Admin":
        raise ForbiddenError(detail="Access denied to this event.")
    return event


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: uuid.UUID,
    data: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(PermissionEnum.MANAGE_SOCIETY.value)),
):
    """
    Update event information. Requires society:manage permission.
    """
    event = await EventService.get_event(db, event_id)
    if current_user.society_id != event.society_id and current_user.role.name != "Super Admin":
        raise ForbiddenError(detail="Access denied to this event.")
    return await EventService.update_event(db, event_id, data, current_user.id)


@router.delete("/{event_id}", response_model=EventResponse)
async def delete_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(PermissionEnum.MANAGE_SOCIETY.value)),
):
    """
    Remove/soft-delete an event. Requires society:manage permission.
    """
    event = await EventService.get_event(db, event_id)
    if current_user.society_id != event.society_id and current_user.role.name != "Super Admin":
        raise ForbiddenError(detail="Access denied to this event.")
    return await EventService.delete_event(db, event_id, current_user.id)


@router.post("/{event_id}/rsvp", response_model=EventRSVPResponse)
async def rsvp_to_event(
    event_id: uuid.UUID,
    data: EventRSVPCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit or update your RSVP attendance status for an event. Any resident can RSVP.
    """
    event = await EventService.get_event(db, event_id)
    if current_user.society_id != event.society_id and current_user.role.name != "Super Admin":
        raise ForbiddenError(detail="Access denied to this event.")
    return await EventService.rsvp_to_event(db, event_id, data, current_user.id)
