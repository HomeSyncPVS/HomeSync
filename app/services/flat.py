import uuid
import csv
import io
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.custom import NotFoundError, ConflictError, ValidationError
from app.models.flat import Flat
from app.models.wing import Wing
from app.models.floor import Floor
from app.repositories.flat import FlatRepository
from app.repositories.floor import FloorRepository
from app.repositories.wing import WingRepository
from app.repositories.society import SocietyRepository
from app.schemas.flat import FlatCreate, FlatUpdate, FlatImportRow

flat_repo = FlatRepository()
floor_repo = FloorRepository()
wing_repo = WingRepository()
society_repo = SocietyRepository()


class FlatService:
    @staticmethod
    async def create_flat(db: AsyncSession, data: FlatCreate, user_id: Optional[uuid.UUID] = None) -> Flat:
        # Check society, wing, and floor existence
        society = await society_repo.get_active(db, data.society_id)
        if not society:
            raise NotFoundError(detail="Society not found or is inactive.", error_code="SOCIETY_NOT_FOUND")

        wing = await wing_repo.get_active(db, data.wing_id)
        if not wing:
            raise NotFoundError(detail="Wing not found or is inactive.", error_code="WING_NOT_FOUND")
        if wing.society_id != data.society_id:
            raise ValidationError(detail="The specified wing does not belong to the selected society.", error_code="INVALID_WING_SOCIETY")

        floor = await floor_repo.get_active(db, data.floor_id)
        if not floor:
            raise NotFoundError(detail="Floor not found or is inactive.", error_code="FLOOR_NOT_FOUND")
        if floor.wing_id != data.wing_id:
            raise ValidationError(detail="The specified floor does not belong to the selected wing.", error_code="INVALID_FLOOR_WING")

        # Check unique flat number within the society
        existing = await flat_repo.get_by_number_and_society(db, data.flat_number, data.society_id)
        if existing:
            raise ConflictError(
                detail=f"Flat number '{data.flat_number}' already exists in this society.",
                error_code="FLAT_ALREADY_EXISTS"
            )

        flat_obj = Flat(
            floor_id=data.floor_id,
            wing_id=data.wing_id,
            society_id=data.society_id,
            flat_number=data.flat_number,
            flat_type=data.flat_type,
            flat_size=data.flat_size,
            occupancy_status=data.occupancy_status,
            created_by=user_id,
            updated_by=user_id
        )
        flat = await flat_repo.create(db, obj_in=flat_obj)
        await db.commit()
        return flat

    @staticmethod
    async def get_flat(db: AsyncSession, id: uuid.UUID) -> Flat:
        # Load wing and floor for rich responses/verification if needed
        query = (
            select(Flat)
            .where(and_(Flat.id == id, Flat.deleted_at.is_(None)))
            .options(selectinload(Flat.wing), selectinload(Flat.floor))
        )
        result = await db.execute(query)
        flat = result.scalar_one_or_none()
        if not flat:
            raise NotFoundError(detail="Flat not found or has been deleted.", error_code="FLAT_NOT_FOUND")
        return flat

    @staticmethod
    async def get_flats(
        db: AsyncSession,
        *,
        society_id: Optional[uuid.UUID] = None,
        wing_id: Optional[uuid.UUID] = None,
        floor_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Flat]:
        return await flat_repo.get_multi_active(
            db, society_id=society_id, wing_id=wing_id, floor_id=floor_id, skip=skip, limit=limit
        )

    @staticmethod
    async def update_flat(
        db: AsyncSession, id: uuid.UUID, data: FlatUpdate, user_id: Optional[uuid.UUID] = None
    ) -> Flat:
        flat = await FlatService.get_flat(db, id)

        if data.flat_number is not None and data.flat_number != flat.flat_number:
            existing = await flat_repo.get_by_number_and_society(db, data.flat_number, flat.society_id)
            if existing and existing.id != id:
                raise ConflictError(
                    detail=f"Flat number '{data.flat_number}' already exists in this society.",
                    error_code="FLAT_ALREADY_EXISTS"
                )

        update_dict = data.model_dump(exclude_unset=True)
        update_dict["updated_by"] = user_id

        updated_flat = await flat_repo.update(db, db_obj=flat, obj_in=update_dict)
        await db.commit()
        return updated_flat

    @staticmethod
    async def delete_flat(db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> Flat:
        flat = await FlatService.get_flat(db, id)
        await flat_repo.delete_soft(db, id, user_id=user_id)
        await db.commit()
        return flat

    @staticmethod
    async def import_flats_csv(db: AsyncSession, society_id: uuid.UUID, csv_content: str, user_id: Optional[uuid.UUID] = None) -> int:
        """
        Transactional import of flats from a CSV string.
        Automatically creates missing wings and floors.
        Rolls back the entire batch if any validation/parsing error occurs.
        """
        # Validate that society exists and is active
        society = await society_repo.get_active(db, society_id)
        if not society:
            raise NotFoundError(detail="Society not found or is inactive.", error_code="SOCIETY_NOT_FOUND")

        # Parse CSV
        f = io.StringIO(csv_content.strip())
        reader = csv.DictReader(f)
        
        if not reader.fieldnames:
            raise ValidationError(detail="CSV is empty or lacks headers.", error_code="EMPTY_CSV")
            
        # Normalize headers to lowercase and strip spaces
        normalized_headers = [header.strip().lower() for header in reader.fieldnames]
        reader.fieldnames = normalized_headers

        required_headers = {"wing_name", "floor_number", "flat_number", "flat_type", "flat_size"}
        missing = required_headers - set(normalized_headers)
        if missing:
            raise ValidationError(
                detail=f"CSV file is missing required headers: {', '.join(missing)}",
                error_code="INVALID_CSV_HEADERS"
            )

        imported_count = 0
        wing_cache = {}
        floor_cache = {}
        flat_number_set = set()

        # Wrap processing in a transaction sub-block
        try:
            for idx, row in enumerate(reader, start=2):
                wing_name = (row.get("wing_name") or "").strip()
                floor_str = (row.get("floor_number") or "").strip()
                flat_number = (row.get("flat_number") or "").strip()
                flat_type = (row.get("flat_type") or "").strip()
                flat_size_str = (row.get("flat_size") or "").strip()
                occupancy = (row.get("occupancy_status") or "VACANT").strip().upper()

                if not wing_name or not floor_str or not flat_number or not flat_type or not flat_size_str:
                    raise ValidationError(
                        detail=f"Row {idx} contains empty required fields.",
                        error_code="ROW_VALIDATION_FAILED"
                    )

                # Validate floor_number is integer
                try:
                    floor_number = int(floor_str)
                except ValueError:
                    raise ValidationError(
                        detail=f"Row {idx}: Floor number '{floor_str}' must be an integer.",
                        error_code="ROW_VALIDATION_FAILED"
                    )

                # Validate flat_size is positive float
                try:
                    flat_size = float(flat_size_str)
                    if flat_size <= 0:
                        raise ValueError()
                except ValueError:
                    raise ValidationError(
                        detail=f"Row {idx}: Flat size '{flat_size_str}' must be a positive decimal number.",
                        error_code="ROW_VALIDATION_FAILED"
                    )

                # Validate occupancy_status
                if occupancy not in ["VACANT", "OCCUPIED_OWNER", "OCCUPIED_TENANT", "UNDER_MAINTENANCE"]:
                    raise ValidationError(
                        detail=f"Row {idx}: Invalid occupancy status '{occupancy}'. Must be VACANT, OCCUPIED_OWNER, OCCUPIED_TENANT, or UNDER_MAINTENANCE.",
                        error_code="ROW_VALIDATION_FAILED"
                    )

                # Prevent duplicate flat numbers within the imported file itself
                if flat_number in flat_number_set:
                    raise ConflictError(
                        detail=f"Row {idx}: Duplicate flat number '{flat_number}' found within the CSV file.",
                        error_code="ROW_CONFLICT"
                    )
                flat_number_set.add(flat_number)

                # 1. Resolve Wing
                wing_key = wing_name.lower()
                if wing_key not in wing_cache:
                    wing_obj = await wing_repo.get_by_name_and_society(db, wing_name, society_id)
                    if not wing_obj:
                        # Auto-create Wing
                        wing_obj = Wing(
                            society_id=society_id,
                            name=wing_name,
                            created_by=user_id,
                            updated_by=user_id
                        )
                        await wing_repo.create(db, obj_in=wing_obj)
                    wing_cache[wing_key] = wing_obj
                wing = wing_cache[wing_key]

                # 2. Resolve Floor within that Wing
                floor_key = (wing.id, floor_number)
                if floor_key not in floor_cache:
                    floor_obj = await floor_repo.get_by_number_and_wing(db, floor_number, wing.id)
                    if not floor_obj:
                        # Auto-create Floor
                        floor_obj = Floor(
                            wing_id=wing.id,
                            floor_number=floor_number,
                            created_by=user_id,
                            updated_by=user_id
                        )
                        await floor_repo.create(db, obj_in=floor_obj)
                    floor_cache[floor_key] = floor_obj
                floor = floor_cache[floor_key]

                # 3. Check if Flat already exists in DB
                existing_flat = await flat_repo.get_by_number_and_society(db, flat_number, society_id)
                if existing_flat:
                    raise ConflictError(
                        detail=f"Row {idx}: Flat number '{flat_number}' already exists in the database for this society.",
                        error_code="ROW_CONFLICT"
                    )

                # 4. Insert Flat
                flat_obj = Flat(
                    floor_id=floor.id,
                    wing_id=wing.id,
                    society_id=society_id,
                    flat_number=flat_number,
                    flat_type=flat_type,
                    flat_size=flat_size,
                    occupancy_status=occupancy,
                    created_by=user_id,
                    updated_by=user_id
                )
                await flat_repo.create(db, obj_in=flat_obj)
                imported_count += 1

            await db.commit()
            return imported_count
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def export_flats_csv(db: AsyncSession, society_id: uuid.UUID) -> str:
        """
        Export all active flats in a society to a CSV string.
        """
        # Validate that society exists and is active
        society = await society_repo.get_active(db, society_id)
        if not society:
            raise NotFoundError(detail="Society not found or is inactive.", error_code="SOCIETY_NOT_FOUND")

        # Fetch active flats with relationships loaded
        query = (
            select(Flat)
            .where(and_(Flat.society_id == society_id, Flat.deleted_at.is_(None)))
            .options(selectinload(Flat.wing), selectinload(Flat.floor))
            .order_by(Flat.flat_number)
        )
        result = await db.execute(query)
        flats = result.scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow(["wing_name", "floor_number", "flat_number", "flat_type", "flat_size", "occupancy_status"])
        
        # Write rows
        for flat in flats:
            writer.writerow([
                flat.wing.name,
                flat.floor.floor_number,
                flat.flat_number,
                flat.flat_type,
                flat.flat_size,
                flat.occupancy_status
            ])
            
        return output.getvalue()
