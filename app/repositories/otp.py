from datetime import datetime, timezone
from typing import Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.otp import OtpCode


class OTPRepository(BaseRepository[OtpCode]):
    def __init__(self):
        super().__init__(OtpCode)

    async def get_active_otp(self, db: AsyncSession, target: str, purpose: str) -> Optional[OtpCode]:
        """
        Fetch the most recent unused active OTP for a target and purpose.
        """
        query = (
            select(OtpCode)
            .where(
                OtpCode.target == target,
                OtpCode.purpose == purpose,
                OtpCode.is_used == False,
                OtpCode.expires_at > datetime.now(timezone.utc),
            )
            .order_by(OtpCode.created_at.desc())
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def mark_as_used(self, db: AsyncSession, otp_id: Any) -> Optional[OtpCode]:
        """
        Mark an OTP as used.
        """
        otp = await self.get(db, otp_id)
        if otp:
            otp.is_used = True
            db.add(otp)
            await db.flush()
        return otp
