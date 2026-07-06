from typing import List, Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.emergency_contact import EmergencyContact


class EmergencyContactRepository(BaseRepository[EmergencyContact]):
    def __init__(self):
        super().__init__(EmergencyContact)

    async def get_by_society(self, db: AsyncSession, society_id: str, user_id: Optional[str] = None) -> List[EmergencyContact]:
        """
        Fetch all emergency contacts for a society, optionally including personal ones for a specific user.
        """
        if user_id:
            query = select(EmergencyContact).where(
                EmergencyContact.society_id == society_id,
                or_(EmergencyContact.user_id.is_(None), EmergencyContact.user_id == user_id)
            )
        else:
            query = select(EmergencyContact).where(
                EmergencyContact.society_id == society_id,
                EmergencyContact.user_id.is_(None)
            )
        result = await db.execute(query)
        return list(result.scalars().all())
