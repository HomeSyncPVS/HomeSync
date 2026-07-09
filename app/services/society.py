import uuid
from typing import List, Optional
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.custom import NotFoundError, ConflictError, ValidationError
from app.models.society import Society, SocietySettings
from app.repositories.society import SocietyRepository
from app.repositories.society_settings import SocietySettingsRepository
from app.schemas.society import SocietyCreate, SocietyUpdate, SocietySettingsUpdate
from app.services.storage import StorageService
from app.core.config import settings

society_repo = SocietyRepository()
settings_repo = SocietySettingsRepository()

class SocietyService:
    @staticmethod
    async def generate_join_code(db: AsyncSession) -> str:
        import random
        import string
        from sqlalchemy import select
        
        while True:
            code = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
            query = select(Society).where(Society.join_code == code)
            result = await db.execute(query)
            if not result.scalar_one_or_none():
                return code

    @staticmethod
    async def create_society(db: AsyncSession, data: SocietyCreate, user_id: Optional[uuid.UUID] = None) -> Society:
        # Check uniqueness of society name inside the region
        existing = await society_repo.get_by_name_and_region(db, data.name, data.region)
        if existing:
            raise ConflictError(
                detail=f"A society named '{data.name}' already exists in the region '{data.region}'.",
                error_code="SOCIETY_ALREADY_EXISTS"
            )

        # Generate unique join code
        join_code = await SocietyService.generate_join_code(db)

        # Create society
        society_obj = Society(
            name=data.name,
            address=data.address,
            region=data.region,
            city=data.city,
            state=data.state,
            pincode=data.pincode,
            phone=data.phone,
            email=data.email,
            join_code=join_code,
            created_by=user_id,
            updated_by=user_id
        )
        society = await society_repo.create(db, obj_in=society_obj)
        await db.flush()

        # Automatically create default society settings
        settings_obj = SocietySettings(
            society_id=society.id,
            created_by=user_id,
            updated_by=user_id
        )
        await settings_repo.create(db, obj_in=settings_obj)
        await db.flush()

        # Generate structure (Wings, Floors, Flats) if provided
        if data.structure:
            from app.models.wing import Wing
            from app.models.floor import Floor
            from app.models.flat import Flat

            num_wings = data.structure.num_wings
            wing_names = data.structure.wing_names or [f"Wing {i}" for i in range(1, num_wings + 1)]
            
            # Pad or truncate wing names
            wing_names = wing_names[:num_wings]
            if len(wing_names) < num_wings:
                wing_names += [f"Wing {i}" for i in range(len(wing_names) + 1, num_wings + 1)]

            for wing_name in wing_names:
                wing_obj = Wing(
                    society_id=society.id,
                    name=wing_name,
                    created_by=user_id,
                    updated_by=user_id
                )
                db.add(wing_obj)
                await db.flush()

                for floor_num in range(1, data.structure.floors_per_wing + 1):
                    floor_obj = Floor(
                        wing_id=wing_obj.id,
                        floor_number=floor_num,
                        created_by=user_id,
                        updated_by=user_id
                    )
                    db.add(floor_obj)
                    await db.flush()

                    for flat_idx in range(1, data.structure.flats_per_floor + 1):
                        flat_num = f"{wing_name}-{floor_num}{flat_idx:02d}"
                        flat_obj = Flat(
                            floor_id=floor_obj.id,
                            wing_id=wing_obj.id,
                            society_id=society.id,
                            flat_number=flat_num,
                            flat_type=data.structure.flat_type,
                            flat_size=data.structure.flat_size,
                            occupancy_status="VACANT",
                            created_by=user_id,
                            updated_by=user_id
                        )
                        db.add(flat_obj)
            await db.flush()

        # Promote creator to Society Admin
        if user_id:
            from app.models.user import User
            from app.models.role import Role
            from app.core.constants import RoleEnum
            from sqlalchemy import select

            query = select(User).where(User.id == user_id)
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            if user:
                role_query = select(Role).where(Role.name == RoleEnum.SOCIETY_ADMIN.value)
                role_result = await db.execute(role_query)
                admin_role = role_result.scalar_one_or_none()
                if admin_role:
                    user.role_id = admin_role.id
                user.society_id = society.id
                user.approval_status = "APPROVED"
                db.add(user)
                await db.flush()

        await db.commit()
        return society

    @staticmethod
    async def get_society(db: AsyncSession, id: uuid.UUID) -> Society:
        society = await society_repo.get_active(db, id)
        if not society:
            raise NotFoundError(detail="Society not found or has been deleted.", error_code="SOCIETY_NOT_FOUND")
        return society

    @staticmethod
    async def get_societies(
        db: AsyncSession, *, skip: int = 0, limit: int = 100, search: Optional[str] = None
    ) -> List[Society]:
        return await society_repo.get_multi_active(db, skip=skip, limit=limit, search=search)

    @staticmethod
    async def update_society(
        db: AsyncSession, id: uuid.UUID, data: SocietyUpdate, user_id: Optional[uuid.UUID] = None
    ) -> Society:
        society = await SocietyService.get_society(db, id)

        # If name or region is being modified, check unique constraints
        new_name = data.name if data.name is not None else society.name
        new_region = data.region if data.region is not None else society.region
        if new_name != society.name or new_region != society.region:
            existing = await society_repo.get_by_name_and_region(db, new_name, new_region)
            if existing and existing.id != id:
                raise ConflictError(
                    detail=f"A society named '{new_name}' already exists in the region '{new_region}'.",
                    error_code="SOCIETY_ALREADY_EXISTS"
                )

        # Perform update
        update_dict = data.model_dump(exclude_unset=True)
        update_dict["updated_by"] = user_id
        
        updated_society = await society_repo.update(db, db_obj=society, obj_in=update_dict)
        await db.commit()
        return updated_society

    @staticmethod
    async def delete_society(db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> Society:
        society = await SocietyService.get_society(db, id)
        
        # Soft delete the society
        await society_repo.delete_soft(db, id, user_id=user_id)
        
        # Also soft delete the associated settings block
        settings_obj = await settings_repo.get_by_society_id(db, id)
        if settings_obj:
            await settings_repo.delete_soft(db, settings_obj.id, user_id=user_id)
        await db.commit()
        return society

    @staticmethod
    async def get_society_settings(db: AsyncSession, society_id: uuid.UUID) -> SocietySettings:
        # Check that the society exists and is active first
        await SocietyService.get_society(db, society_id)
        
        settings_obj = await settings_repo.get_by_society_id(db, society_id)
        if not settings_obj:
            raise NotFoundError(detail="Settings for this society do not exist.", error_code="SETTINGS_NOT_FOUND")
        return settings_obj

    @staticmethod
    async def update_society_settings(
        db: AsyncSession, society_id: uuid.UUID, data: SocietySettingsUpdate, user_id: Optional[uuid.UUID] = None
    ) -> SocietySettings:
        # Check that the society exists and is active first
        await SocietyService.get_society(db, society_id)

        settings_obj = await settings_repo.get_by_society_id(db, society_id)
        if not settings_obj:
            raise NotFoundError(detail="Settings for this society do not exist.", error_code="SETTINGS_NOT_FOUND")

        update_dict = data.model_dump(exclude_unset=True)
        update_dict["updated_by"] = user_id
        
        updated_settings = await settings_repo.update(db, db_obj=settings_obj, obj_in=update_dict)
        await db.commit()
        return updated_settings

    @staticmethod
    async def upload_branding_asset(
        db: AsyncSession, id: uuid.UUID, file: UploadFile, is_logo: bool, user_id: Optional[uuid.UUID] = None
    ) -> Society:
        society = await SocietyService.get_society(db, id)

        # Validate file size (e.g. 5MB max limit)
        max_size = 5 * 1024 * 1024
        contents = await file.read()
        if len(contents) > max_size:
            raise ValidationError(detail="File size exceeds maximum limit of 5MB.", error_code="FILE_TOO_LARGE")

        # Validate content type
        allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
        if file.content_type not in allowed_types:
            raise ValidationError(detail="Invalid file format. Only JPEG, PNG, and WebP are allowed.", error_code="INVALID_FILE_TYPE")

        # Generate a unique path/file name in the storage bucket
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
        asset_type = "logo" if is_logo else "banner"
        unique_filename = f"societies/{id}/{asset_type}_{uuid.uuid4()}.{file_ext}"

        # Upload using the storage service
        public_url = await StorageService.upload_profile_image(
            file_bytes=contents,
            file_name=unique_filename,
            content_type=file.content_type
        )

        # Extract and delete the old asset if it exists
        old_url = society.logo_url if is_logo else society.banner_url
        if old_url:
            try:
                prefix = f"public/{settings.SUPABASE_BUCKET_NAME}/"
                if prefix in old_url:
                    old_filename = old_url.split(prefix)[-1]
                    await StorageService.delete_profile_image(old_filename)
            except Exception:
                # Do not fail upload if deleting the old file errors out
                pass

        # Update database fields
        if is_logo:
            society.logo_url = public_url
        else:
            society.banner_url = public_url

        society.updated_by = user_id
        db.add(society)
        await db.commit()
        return await SocietyService.get_society(db, id)

    @staticmethod
    async def delete_branding_asset(
        db: AsyncSession, id: uuid.UUID, is_logo: bool, user_id: Optional[uuid.UUID] = None
    ) -> Society:
        society = await SocietyService.get_society(db, id)

        old_url = society.logo_url if is_logo else society.banner_url
        if not old_url:
            raise NotFoundError(
                detail=f"Society does not have a {'logo' if is_logo else 'banner'} uploaded.",
                error_code="BRANDING_NOT_FOUND"
            )

        # Delete from Supabase Storage
        try:
            prefix = f"public/{settings.SUPABASE_BUCKET_NAME}/"
            if prefix in old_url:
                old_filename = old_url.split(prefix)[-1]
                await StorageService.delete_profile_image(old_filename)
        except Exception:
            # Continue database deletion even if storage deletion fails
            pass

        # Update database fields
        if is_logo:
            society.logo_url = None
        else:
            society.banner_url = None

        society.updated_by = user_id
        db.add(society)
        await db.commit()
        return await SocietyService.get_society(db, id)

    @staticmethod
    async def get_society_by_join_code(db: AsyncSession, code: str) -> Society:
        from sqlalchemy import select
        query = select(Society).where(Society.join_code == code.upper().strip(), Society.deleted_at.is_(None))
        result = await db.execute(query)
        society = result.scalar_one_or_none()
        if not society:
            raise NotFoundError(detail="Society not found for the specified join code.", error_code="SOCIETY_NOT_FOUND")
        return society
