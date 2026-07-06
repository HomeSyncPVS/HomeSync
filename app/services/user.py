import mimetypes
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.repositories.user import UserRepository
from app.services.storage import StorageService
from app.schemas.auth import UserUpdateRequest
from app.exceptions.custom import ValidationError, ConflictError

user_repo = UserRepository()


class UserService:
    @staticmethod
    async def update_profile(db: AsyncSession, user: User, data: UserUpdateRequest) -> User:
        """
        Update user profile information.
        """
        if data.phone and data.phone != user.phone:
            # Check if new phone is already registered
            existing_phone = await user_repo.get_by_phone(db, data.phone)
            if existing_phone:
                raise ConflictError(detail="Phone number is already in use.", error_code="PHONE_IN_USE")
            user.phone = data.phone

        if data.full_name is not None:
            user.full_name = data.full_name

        if data.society_id is not None:
            user.society_id = data.society_id

        if data.flat_id is not None:
            user.flat_id = data.flat_id

        db.add(user)
        await db.flush()
        return user

    @staticmethod
    async def update_profile_image(
        db: AsyncSession, user: User, file_bytes: bytes, filename: str, content_type: str
    ) -> User:
        """
        Upload profile image to storage and update user record.
        """
        # Validate content type
        if not content_type.startswith("image/"):
            raise ValidationError(detail="File must be an image.", error_code="INVALID_FILE_TYPE")

        # Extract extension
        ext = mimetypes.guess_extension(content_type) or ".jpg"
        file_path = f"profiles/{user.id}/profile_image{ext}"

        # Upload to Supabase Storage
        public_url = await StorageService.upload_profile_image(file_bytes, file_path, content_type)

        # Update User
        user.profile_image_url = public_url
        db.add(user)
        await db.flush()
        return user

    @staticmethod
    async def delete_profile_image(db: AsyncSession, user: User) -> User:
        """
        Remove profile image from storage and clear URL on user record.
        """
        if not user.profile_image_url:
            return user

        # Attempt to delete file from Supabase storage
        # Extract file path from url: url ends with profiles/{id}/profile_image.ext
        if "profile_image" in user.profile_image_url:
            parts = user.profile_image_url.split("/")
            # Reconstruction key: e.g. profiles/user_id/profile_image.ext
            try:
                profile_idx = parts.index("profiles")
                file_path = "/".join(parts[profile_idx:])
                await StorageService.delete_profile_image(file_path)
            except ValueError:
                pass

        user.profile_image_url = None
        db.add(user)
        await db.flush()
        return user

    @staticmethod
    async def delete_user_account(db: AsyncSession, user: User) -> None:
        """
        Delete user account from the database (cascades sessions, devices, etc.).
        """
        # Delete profile image from storage first
        await UserService.delete_profile_image(db, user)
        await user_repo.delete(db, id=user.id)
        await db.flush()
