import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.vendor import Vendor, VendorRating
from app.repositories.vendor import VendorRepository, VendorRatingRepository
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorRatingCreate
from app.exceptions.custom import ConflictError, NotFoundError, ValidationError

vendor_repo = VendorRepository()
rating_repo = VendorRatingRepository()


class VendorService:
    @staticmethod
    async def create_vendor(db: AsyncSession, data: VendorCreate, current_user_id: uuid.UUID) -> Vendor:
        """
        Register a new vendor in the society.
        """
        # Check if vendor already exists with the same phone in the society
        existing = await vendor_repo.get_by_phone(db, data.society_id, data.phone)
        if existing:
            raise ConflictError(
                detail="A vendor with this phone number is already registered in this society.",
                error_code="VENDOR_ALREADY_EXISTS"
            )

        new_vendor = Vendor(
            society_id=data.society_id,
            name=data.name,
            phone=data.phone,
            email=data.email,
            category=data.category,
            experience=data.experience,
            status=data.status,
            created_by=current_user_id,
            updated_by=current_user_id,
        )
        vendor = await vendor_repo.create(db, obj_in=new_vendor)
        await db.flush()
        return vendor

    @staticmethod
    async def update_vendor(db: AsyncSession, vendor_id: uuid.UUID, data: VendorUpdate, current_user_id: uuid.UUID) -> Vendor:
        """
        Update an existing vendor profile.
        """
        vendor = await vendor_repo.get(db, id=vendor_id)
        if not vendor or vendor.deleted_at is not None:
            raise NotFoundError(detail="Vendor not found.", error_code="VENDOR_NOT_FOUND")

        # Check unique constraint if phone is updated
        if data.phone and data.phone != vendor.phone:
            existing = await vendor_repo.get_by_phone(db, vendor.society_id, data.phone)
            if existing:
                raise ConflictError(
                    detail="A vendor with this phone number is already registered in this society.",
                    error_code="VENDOR_ALREADY_EXISTS"
                )

        update_dict = data.model_dump(exclude_unset=True)
        update_dict["updated_by"] = current_user_id
        update_dict["updated_at"] = datetime.now(timezone.utc)

        vendor = await vendor_repo.update(db, db_obj=vendor, obj_in=update_dict)
        await db.flush()
        return vendor

    @staticmethod
    async def delete_vendor(db: AsyncSession, vendor_id: uuid.UUID, current_user_id: uuid.UUID) -> Vendor:
        """
        Soft-delete a vendor.
        """
        vendor = await vendor_repo.get(db, id=vendor_id)
        if not vendor or vendor.deleted_at is not None:
            raise NotFoundError(detail="Vendor not found.", error_code="VENDOR_NOT_FOUND")

        vendor.deleted_at = datetime.now(timezone.utc)
        vendor.updated_by = current_user_id
        db.add(vendor)
        await db.flush()
        return vendor

    @staticmethod
    async def get_vendor(db: AsyncSession, vendor_id: uuid.UUID) -> Vendor:
        """
        Fetch vendor by ID.
        """
        vendor = await vendor_repo.get(db, id=vendor_id)
        if not vendor or vendor.deleted_at is not None:
            raise NotFoundError(detail="Vendor not found.", error_code="VENDOR_NOT_FOUND")
        return vendor

    @staticmethod
    async def get_vendors(db: AsyncSession, society_id: uuid.UUID, category: Optional[str] = None) -> List[Vendor]:
        """
        List all vendors for a society, optionally filtered by service category.
        """
        if category:
            return await vendor_repo.get_by_category(db, society_id, category)
        return await vendor_repo.get_all_by_society(db, society_id)

    @staticmethod
    async def rate_vendor(
        db: AsyncSession,
        vendor_id: uuid.UUID,
        rating_data: VendorRatingCreate,
        current_user_id: uuid.UUID
    ) -> VendorRating:
        """
        Add a 5-star rating for a vendor and update the vendor's average rating.
        """
        vendor = await vendor_repo.get(db, id=vendor_id)
        if not vendor or vendor.deleted_at is not None:
            raise NotFoundError(detail="Vendor not found.", error_code="VENDOR_NOT_FOUND")

        new_rating = VendorRating(
            vendor_id=vendor_id,
            user_id=current_user_id,
            rating=rating_data.rating,
            feedback=rating_data.feedback,
        )
        rating = await rating_repo.create(db, obj_in=new_rating)
        await db.flush()

        # Recalculate average rating for the vendor
        all_ratings = await rating_repo.get_ratings_by_vendor(db, vendor_id)
        if all_ratings:
            avg_rating = sum(r.rating for r in all_ratings) / len(all_ratings)
            vendor.rating = round(avg_rating, 2)
            db.add(vendor)
            await db.flush()

        return rating
