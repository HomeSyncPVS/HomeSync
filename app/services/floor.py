import uuid
from typing import List, Optional
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.custom import NotFoundError, ConflictError
from app.models.floor import Floor
from app.models.flat import Flat
from app.repositories.floor import FloorRepository
from app.repositories.wing import WingRepository
from app.schemas.floor import FloorCreate, FloorUpdate
from datetime import datetime, timezone

floor_repo = FloorRepository()
wing_repo = WingRepository()


class FloorService:
    @staticmethod
    async def create_floor(db: AsyncSession, data: FloorCreate, user_id: Optional[uuid.UUID] = None) -> Floor:
        # Check that wing exists and is active
        wing = await wing_repo.get_active(db, data.wing_id)
        if not wing:
            raise NotFoundError(detail="Wing not found or is inactive.", error_code="WING_NOT_FOUND")

        # Check unique floor number inside the wing
        existing = await floor_repo.get_by_number_and_wing(db, data.floor_number, data.wing_id)
        if existing:
            raise ConflictError(
                detail=f"Floor number {data.floor_number} already exists inside this wing.",
                error_code="FLOOR_ALREADY_EXISTS"
            )

        floor_obj = Floor(
            wing_id=data.wing_id,
            floor_number=data.floor_number,
            created_by=user_id,
            updated_by=user_id
        )
        floor = await floor_repo.create(db, obj_in=floor_obj)
        await db.commit()
        return floor

    @staticmethod
    async def get_floor(db: AsyncSession, id: uuid.UUID) -> Floor:
        floor = await floor_repo.get_active(db, id)
        if not floor:
            raise NotFoundError(detail="Floor not found or has been deleted.", error_code="FLOOR_NOT_FOUND")
        return floor

    @staticmethod
    async def get_floors(
        db: AsyncSession, *, wing_id: Optional[uuid.UUID] = None, skip: int = 0, limit: int = 100
    ) -> List[Floor]:
        return await floor_repo.get_multi_active(db, wing_id=wing_id, skip=skip, limit=limit)

    @staticmethod
    async def update_floor(
        db: AsyncSession, id: uuid.UUID, data: FloorUpdate, user_id: Optional[uuid.UUID] = None
    ) -> Floor:
        floor = await FloorService.get_floor(db, id)

        if data.floor_number != floor.floor_number:
            # Check uniqueness in the same wing
            existing = await floor_repo.get_by_number_and_wing(db, data.floor_number, floor.wing_id)
            if existing and existing.id != id:
                raise ConflictError(
                    detail=f"Floor number {data.floor_number} already exists inside this wing.",
                    error_code="FLOOR_ALREADY_EXISTS"
                )

        update_dict = data.model_dump(exclude_unset=True)
        update_dict["updated_by"] = user_id

        updated_floor = await floor_repo.update(db, db_obj=floor, obj_in=update_dict)
        await db.commit()
        return updated_floor

    @staticmethod
    async def delete_floor(db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> Floor:
        floor = await FloorService.get_floor(db, id)
        now = datetime.now(timezone.utc)

        # Soft delete the floor itself
        await floor_repo.delete_soft(db, id, user_id=user_id)

        # Cascade soft delete all flats on this floor
        await db.execute(
            update(Flat)
            .where(Flat.floor_id == id)
            .where(Flat.deleted_at.is_(None))
            .values(deleted_at=now, updated_by=user_id)
        )

        await db.commit()
        return floor
