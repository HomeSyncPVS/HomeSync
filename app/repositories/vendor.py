from typing import Optional, List
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.vendor import Vendor, VendorRating


class VendorRepository(BaseRepository[Vendor]):
    def __init__(self):
        super().__init__(Vendor)

    async def get_by_phone(self, db: AsyncSession, society_id: uuid.UUID, phone: str) -> Optional[Vendor]:
        """
        Fetch a vendor by their phone number in a specific society.
        """
        query = select(Vendor).where(Vendor.society_id == society_id, Vendor.phone == phone, Vendor.deleted_at == None)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_category(self, db: AsyncSession, society_id: uuid.UUID, category: str) -> List[Vendor]:
        """
        Fetch all active vendors by category in a specific society.
        """
        query = select(Vendor).where(
            Vendor.society_id == society_id,
            Vendor.category == category,
            Vendor.status == "ACTIVE",
            Vendor.deleted_at == None
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_all_by_society(self, db: AsyncSession, society_id: uuid.UUID) -> List[Vendor]:
        """
        Fetch all active and inactive vendors in a specific society.
        """
        query = select(Vendor).where(Vendor.society_id == society_id, Vendor.deleted_at == None)
        result = await db.execute(query)
        return list(result.scalars().all())


class VendorRatingRepository(BaseRepository[VendorRating]):
    def __init__(self):
        super().__init__(VendorRating)

    async def get_ratings_by_vendor(self, db: AsyncSession, vendor_id: uuid.UUID) -> List[VendorRating]:
        """
        Fetch all ratings for a specific vendor.
        """
        query = select(VendorRating).where(VendorRating.vendor_id == vendor_id).order_by(VendorRating.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())
