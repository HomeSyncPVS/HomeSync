from typing import List, Optional, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.device import Device


class DeviceRepository(BaseRepository[Device]):
    def __init__(self):
        super().__init__(Device)

    async def get_by_user_and_token(self, db: AsyncSession, user_id: Any, push_token: str) -> Optional[Device]:
        """
        Get device matching a user ID and a push token.
        """
        query = select(Device).where(Device.user_id == user_id, Device.push_token == push_token)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_active_devices_by_user_id(self, db: AsyncSession, user_id: Any) -> List[Device]:
        """
        Get all active devices for a user.
        """
        query = select(Device).where(Device.user_id == user_id, Device.is_active == True)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def deactivate_device(self, db: AsyncSession, device_id: Any) -> Optional[Device]:
        """
        Deactivate a device.
        """
        device = await self.get(db, device_id)
        if device:
            device.is_active = False
            db.add(device)
            await db.flush()
        return device
