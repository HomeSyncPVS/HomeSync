import uuid
from typing import List, Optional
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.custom import NotFoundError, ConflictError
from app.models.wing import Wing
from app.models.floor import Floor
from app.models.flat import Flat
from app.repositories.wing import WingRepository
from app.repositories.society import SocietyRepository
from app.schemas.wing import WingCreate, WingUpdate
from datetime import datetime, timezone

wing_repo = WingRepository()
society_repo = SocietyRepository()


class WingService:
    @staticmethod
    async def create_wing(db: AsyncSession, data: WingCreate, user_id: Optional[uuid.UUID] = None) -> Wing:
        # Check that society exists and is active
        society = await society_repo.get_active(db, data.society_id)
        if not society:
            raise NotFoundError(detail="Society not found or is inactive.", error_code="SOCIETY_NOT_FOUND")

        # Check unique wing name within the society
        existing = await wing_repo.get_by_name_and_society(db, data.name, data.society_id)
        if existing:
            raise ConflictError(
                detail=f"A wing named '{data.name}' already exists inside this society.",
                error_code="WING_ALREADY_EXISTS"
            )

        wing_obj = Wing(
            society_id=data.society_id,
            name=data.name,
            created_by=user_id,
            updated_by=user_id
        )
        wing = await wing_repo.create(db, obj_in=wing_obj)
        await db.commit()
        return wing

    @staticmethod
    async def get_wing(db: AsyncSession, id: uuid.UUID) -> Wing:
        wing = await wing_repo.get_active(db, id)
        if not wing:
            raise NotFoundError(detail="Wing not found or has been deleted.", error_code="WING_NOT_FOUND")
        return wing

    @staticmethod
    async def get_wings(
        db: AsyncSession, *, society_id: Optional[uuid.UUID] = None, skip: int = 0, limit: int = 100
    ) -> List[Wing]:
        return await wing_repo.get_multi_active(db, society_id=society_id, skip=skip, limit=limit)

    @staticmethod
    async def update_wing(
        db: AsyncSession, id: uuid.UUID, data: WingUpdate, user_id: Optional[uuid.UUID] = None
    ) -> Wing:
        wing = await WingService.get_wing(db, id)

        if data.name != wing.name:
            # Check uniqueness in the same society
            existing = await wing_repo.get_by_name_and_society(db, data.name, wing.society_id)
            if existing and existing.id != id:
                raise ConflictError(
                    detail=f"A wing named '{data.name}' already exists inside this society.",
                    error_code="WING_ALREADY_EXISTS"
                )

        update_dict = data.model_dump(exclude_unset=True)
        update_dict["updated_by"] = user_id

        updated_wing = await wing_repo.update(db, db_obj=wing, obj_in=update_dict)
        await db.commit()
        return updated_wing

    @staticmethod
    async def delete_wing(db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> Wing:
        wing = await WingService.get_wing(db, id)
        now = datetime.now(timezone.utc)

        # Soft delete the wing itself
        await wing_repo.delete_soft(db, id, user_id=user_id)

        # Cascade soft delete all floors in this wing
        await db.execute(
            update(Floor)
            .where(Floor.wing_id == id)
            .where(Floor.deleted_at.is_(None))
            .values(deleted_at=now, updated_by=user_id)
        )

        # Cascade soft delete all flats in this wing
        await db.execute(
            update(Flat)
            .where(Flat.wing_id == id)
            .where(Flat.deleted_at.is_(None))
            .values(deleted_at=now, updated_by=user_id)
        )

        await db.commit()
        return wing
