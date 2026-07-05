import logging
import httpx
from app.core.config import settings

logger = logging.getLogger("homesync.storage")


class StorageService:
    @staticmethod
    async def upload_profile_image(file_bytes: bytes, file_name: str, content_type: str) -> str:
        """
        Upload a profile image to Supabase Storage bucket.
        Returns the public URL of the uploaded image.
        """
        if "mock.supabase.co" in settings.SUPABASE_URL:
            logger.info("[MOCK STORAGE] Uploaded profile image to Supabase.")
            return f"https://mock.supabase.co/storage/v1/object/public/{settings.SUPABASE_BUCKET_NAME}/{file_name}"

        url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_BUCKET_NAME}/{file_name}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "ApiKey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": content_type,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, content=file_bytes, headers=headers)
            
            # If 400 with "Duplicate" message, we should try updating (PUT)
            if response.status_code == 400 and "Duplicate" in response.text:
                response = await client.put(url, content=file_bytes, headers=headers)
                
            if response.status_code not in (200, 201):
                logger.error(f"Supabase upload error: {response.text}")
                raise Exception("Failed to upload profile image to storage service.")

        # Return public URL
        return f"{settings.SUPABASE_URL}/storage/v1/object/public/{settings.SUPABASE_BUCKET_NAME}/{file_name}"

    @staticmethod
    async def delete_profile_image(file_name: str) -> None:
        """
        Delete a profile image from Supabase Storage bucket.
        """
        if "mock.supabase.co" in settings.SUPABASE_URL:
            logger.info("[MOCK STORAGE] Deleted profile image from Supabase.")
            return

        url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_BUCKET_NAME}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "ApiKey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
        }
        body = {"prefixes": [file_name]}

        async with httpx.AsyncClient() as client:
            response = await client.request("DELETE", url, json=body, headers=headers)
            if response.status_code not in (200, 204):
                logger.warning(f"Could not delete image {file_name} from Supabase: {response.text}")
                # Don't raise error, just log warning as the image is already missing/removed
