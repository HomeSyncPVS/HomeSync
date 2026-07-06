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
        if data.rsvp_deadline > data.date_time:
            raise ValidationError(
                detail="RSVP deadline must be before the event date/time.",
                error_code="INVALID_RSVP_DEADLINE"
            )

        new_event = Event(
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
        event = await event_repo.create(db, obj_in=new_event)
        await db.flush()
        return await event_repo.get_with_rsvps(db, event.id)

    @staticmethod
    async def update_event(
        db: AsyncSession,
        event_id: uuid.UUID,
        data: EventUpdate,
        current_user_id: uuid.UUID
    ) -> Event:
        """
        Update an event's details.
        """
        event = await event_repo.get_with_rsvps(db, event_id)
        if not event or event.deleted_at is not None:
            raise NotFoundError(detail="Event not found.", error_code="EVENT_NOT_FOUND")

        update_dict = data.model_dump(exclude_unset=True)

        # Validate date and RSVP deadline if updated
        new_date = update_dict.get("date_time", event.date_time)
        new_deadline = update_dict.get("rsvp_deadline", event.rsvp_deadline)
        if new_deadline > new_date:
            raise ValidationError(
                detail="RSVP deadline must be before the event date/time.",
                error_code="INVALID_RSVP_DEADLINE"
            )

        event = await event_repo.update(db, db_obj=event, obj_in=update_dict)
        await db.flush()
        return await event_repo.get_with_rsvps(db, event.id)

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
    async def rsvp_to_event(
        db: AsyncSession,
        event_id: uuid.UUID,
        rsvp_data: EventRSVPCreate,
        current_user_id: uuid.UUID
    ) -> EventRSVP:
        """
        RSVP to an event. Handles validation of deadline, capacity, and duplicate responses.
        """
        event = await event_repo.get_with_rsvps(db, event_id)
        if not event or event.deleted_at is not None:
            raise NotFoundError(detail="Event not found.", error_code="EVENT_NOT_FOUND")

        now = datetime.now(timezone.utc)
        if now > event.rsvp_deadline:
            raise ValidationError(
                detail="RSVP deadline has passed for this event.",
                error_code="RSVP_DEADLINE_PASSED"
            )

        # If RSVP is 'Attending', check capacity
        if rsvp_data.status.lower() == "attending" and event.capacity is not None:
            # Calculate total current attending guests
            current_attending = sum(1 + r.additional_guests for r in event.rsvps if r.status.lower() == "attending")
            new_guests = 1 + rsvp_data.additional_guests
            if current_attending + new_guests > event.capacity:
                raise ValidationError(
                    detail="This event is already at full capacity.",
                    error_code="EVENT_AT_CAPACITY"
                )

        existing_rsvp = await rsvp_repo.get_by_user(db, event_id, current_user_id)
        if existing_rsvp:
            # Update existing response
            existing_rsvp.status = rsvp_data.status
            existing_rsvp.additional_guests = rsvp_data.additional_guests
            existing_rsvp.updated_at = now
            db.add(existing_rsvp)
            await db.flush()
            return existing_rsvp

        new_rsvp = EventRSVP(
            event_id=event_id,
            user_id=current_user_id,
            status=rsvp_data.status,
            additional_guests=rsvp_data.additional_guests,
        )
        rsvp = await rsvp_repo.create(db, obj_in=new_rsvp)
        await db.flush()
        return rsvp
