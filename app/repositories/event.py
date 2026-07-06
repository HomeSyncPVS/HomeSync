from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.event import Event, EventRSVP


class EventRepository(BaseRepository[Event]):
    def __init__(self):
        super().__init__(Event)

    async def get_with_rsvps(self, db: AsyncSession, id: uuid.UUID) -> Optional[Event]:
        """
        Fetch an event by ID with all RSVPs preloaded.
        """
        query = select(Event).where(Event.id == id, Event.deleted_at == None).options(
            selectinload(Event.rsvps)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_all_by_society(self, db: AsyncSession, society_id: uuid.UUID) -> List[Event]:
        """
        Fetch all active events in a society.
        """
        query = select(Event).where(Event.society_id == society_id, Event.deleted_at == None).options(
            selectinload(Event.rsvps)
        ).order_by(Event.date_time.asc())
        result = await db.execute(query)
        return list(result.scalars().all())


class EventRSVPRepository(BaseRepository[EventRSVP]):
    def __init__(self):
        super().__init__(EventRSVP)

    async def get_by_user(self, db: AsyncSession, event_id: uuid.UUID, user_id: uuid.UUID) -> Optional[EventRSVP]:
        """
        Fetch RSVP record for a specific user and event.
        """
        query = select(EventRSVP).where(EventRSVP.event_id == event_id, EventRSVP.user_id == user_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()
