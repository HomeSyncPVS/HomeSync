import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.event import Event, EventRSVP
from app.repositories.event import EventRepository, EventRSVPRepository
from app.schemas.event import EventCreate, EventUpdate, EventRSVPCreate
from app.exceptions.custom import NotFoundError, ValidationError

event_repo = EventRepository()
rsvp_repo = EventRSVPRepository()


class EventService:
    @staticmethod
    async def create_event(db: AsyncSession, data: EventCreate, current_user_id: uuid.UUID) -> Event:
        """
        Create a new society event.
        """
        # Handle timezone comparison (make now naive if date_time is naive)
        now = datetime.now(timezone.utc)
        event_dt = data.date_time
        if event_dt.tzinfo is None:
            now = now.replace(tzinfo=None)

        if event_dt <= now:
            raise ValidationError(
                detail="Event date must be in the future.",
                error_code="INVALID_EVENT_DATE"
            )

        # Validate RSVP deadline is before event date
        if data.rsvp_deadline >= event_dt:
            raise ValidationError(
                detail="RSVP deadline must be before the event date.",
                error_code="INVALID_RSVP_DEADLINE"
            )

        event = Event(
            society_id=data.society_id,
            name=data.name,
            description=data.description,
            date_time=data.date_time,
            duration_minutes=data.duration_minutes,
            location=data.location,
            poster_url=data.poster_url,
            rsvp_deadline=data.rsvp_deadline,
            capacity=data.capacity,
            entry_fee=data.entry_fee,
            created_by=current_user_id,
        )
        event = await event_repo.create(db, obj_in=event)
        await db.flush()
        # Directly set on __dict__ to avoid lazy loading trigger in SQLAlchemy
        event.__dict__["rsvps"] = []
        return event

    @staticmethod
    async def update_event(
        db: AsyncSession,
        event_id: uuid.UUID,
        data: EventUpdate,
        current_user_id: uuid.UUID
    ) -> Event:
        """
        Update event details.
        """
        event = await event_repo.get(db, id=event_id)
        if not event or event.deleted_at is not None:
            raise NotFoundError(detail="Event not found.", error_code="EVENT_NOT_FOUND")

        update_dict = data.model_dump(exclude_unset=True)

        # Validate date changes if provided
        new_date = update_dict.get("date_time", event.date_time)
        new_rsvp = update_dict.get("rsvp_deadline", event.rsvp_deadline)

        if "date_time" in update_dict:
            now = datetime.now(timezone.utc)
            if new_date.tzinfo is None:
                now = now.replace(tzinfo=None)
            if new_date <= now:
                raise ValidationError(
                    detail="Event date must be in the future.",
                    error_code="INVALID_EVENT_DATE"
                )

        if new_rsvp >= new_date:
            raise ValidationError(
                detail="RSVP deadline must be before the event date.",
                error_code="INVALID_RSVP_DEADLINE"
            )

        event = await event_repo.update(db, db_obj=event, obj_in=update_dict)
        await db.flush()
        if "rsvps" not in event.__dict__:
            event.__dict__["rsvps"] = []
        return event

    @staticmethod
    async def delete_event(db: AsyncSession, event_id: uuid.UUID, current_user_id: uuid.UUID) -> Event:
        """
        Soft-delete an event.
        """
        event = await event_repo.get(db, id=event_id)
        if not event or event.deleted_at is not None:
            raise NotFoundError(detail="Event not found.", error_code="EVENT_NOT_FOUND")

        event.deleted_at = datetime.now(timezone.utc)
        db.add(event)
        await db.flush()
        await db.refresh(event)
        if "rsvps" not in event.__dict__:
            event.__dict__["rsvps"] = []
        return event

    @staticmethod
    async def get_event(db: AsyncSession, event_id: uuid.UUID) -> Event:
        """
        Get event by ID.
        """
        event = await event_repo.get_with_rsvps(db, event_id)
        if not event or event.deleted_at is not None:
            raise NotFoundError(detail="Event not found.", error_code="EVENT_NOT_FOUND")
        return event

    @staticmethod
    async def get_events(db: AsyncSession, society_id: uuid.UUID) -> List[Event]:
        """
        Get all events for a society.
        """
        return await event_repo.get_all_by_society(db, society_id)

    @staticmethod
    async def rsvp_event(
        db: AsyncSession,
        event_id: uuid.UUID,
        user_id: uuid.UUID,
        data: EventRSVPCreate
    ) -> EventRSVP:
        """
        Submit/Update RSVP for an event.
        """
        event = await event_repo.get(db, id=event_id)
        if not event or event.deleted_at is not None:
            raise NotFoundError(detail="Event not found.", error_code="EVENT_NOT_FOUND")

        # Validate RSVP deadline has not passed
        now = datetime.now(timezone.utc)
        deadline = event.rsvp_deadline
        if deadline.tzinfo is None:
            now = now.replace(tzinfo=None)

        if now > deadline:
            raise ValidationError(
                detail="RSVP deadline has passed.",
                error_code="RSVP_DEADLINE_PASSED"
            )

        # Check if RSVP already exists
        rsvp = await rsvp_repo.get_by_event_and_user(db, event_id, user_id)
        if rsvp:
            rsvp.status = rsvp.status if data.status is None else data.status
            rsvp.additional_guests = data.additional_guests
            db.add(rsvp)
        else:
            rsvp = EventRSVP(
                event_id=event_id,
                user_id=user_id,
                status=data.status,
                additional_guests=data.additional_guests
            )
            await rsvp_repo.create(db, obj_in=rsvp)

        await db.flush()
        return rsvp
