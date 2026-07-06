from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.vehicle import Vehicle


class VehicleRepository(BaseRepository[Vehicle]):
    def __init__(self):
        super().__init__(Vehicle)

    async def get_by_user(self, db: AsyncSession, user_id: str) -> List[Vehicle]:
        """
        Fetch all vehicles of a user.
        """
        query = select(Vehicle).where(Vehicle.user_id == user_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_by_number(self, db: AsyncSession, vehicle_number: str) -> Optional[Vehicle]:
        """
        Fetch a vehicle by vehicle number.
        """
        query = select(Vehicle).where(Vehicle.vehicle_number == vehicle_number)
        result = await db.execute(query)
        return result.scalar_one_or_none()
