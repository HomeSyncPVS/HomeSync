import logging
import httpx
import uuid
import jwt
from typing import Any, Dict, Optional

from app.core.config import settings
from app.exceptions.custom import (
    AuthenticationError,
    ConflictError,
    ForbiddenError,
    ValidationError,
    RateLimitError,
)
from app.core.security import create_access_token, create_refresh_token

logger = logging.getLogger("homesync.supabase_auth")


def is_supabase_mock() -> bool:
    return "mock.supabase.co" in settings.SUPABASE_URL


class SupabaseAuthClient:
    @staticmethod
    def _handle_error(response: httpx.Response) -> None:
        try:
            data = response.json()
            message = (
                data.get("error_description")
                or data.get("msg")
                or data.get("error", {}).get("message")
                or response.text
            )
        except Exception:
            message = response.text

        status_code = response.status_code
        logger.error(f"[Supabase Auth Error] {status_code} - {message}")
        
        if status_code == 400:
            if "invalid" in message.lower() or "credentials" in message.lower() or "not confirmed" in message.lower():
                raise AuthenticationError(detail=message)
            raise ValidationError(detail=message)
        elif status_code == 401:
            raise AuthenticationError(detail=message)
        elif status_code == 403:
            raise ForbiddenError(detail=message)
        elif status_code == 409:
            raise ConflictError(detail=message)
        elif status_code == 429:
            raise RateLimitError(detail=message)
        else:
            raise ValidationError(detail=f"Supabase Authentication error: {message}")

    @staticmethod
    async def signup_user(email: str, password: str, phone: Optional[str] = None) -> Dict[str, Any]:
        """
        Registers a user with Supabase Auth (GoTrue).
        """
        if is_supabase_mock():
            logger.info(f"[MOCK AUTH] Signed up user: {email}")
            user_id = str(uuid.uuid4())
            return {"id": user_id, "email": email}

        url = f"{settings.SUPABASE_URL}/auth/v1/signup"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
        }
        body = {
            "email": email,
            "password": password,
        }
        if phone:
            body["phone"] = phone

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=body, headers=headers)
            if response.status_code not in (200, 201):
                SupabaseAuthClient._handle_error(response)
            
            return response.json()

    @staticmethod
    async def login_user(email: str, password: str, db: Any) -> Dict[str, Any]:
        """
        Authenticates a user via Supabase Auth (GoTrue).
        """
        if is_supabase_mock():
            # In mock mode, fetch local user to create a valid mock access token
            from app.repositories.user import UserRepository
            user_repo = UserRepository()
            user = await user_repo.get_by_email(db, email)
            if not user:
                user = await user_repo.get_by_phone(db, email)
            if not user:
                raise AuthenticationError(detail="Invalid email or password.")
            
            session_id = uuid.uuid4()
            user_permissions = [p.name for p in user.role.permissions] if user.role else []
            role_name = user.role.name if user.role else "Resident"
            
            access_token = create_access_token(
                user_id=str(user.id),
                role=role_name,
                permissions=user_permissions,
                session_id=str(session_id),
                society_id=str(user.society_id) if user.society_id else None,
            )
            refresh_token = create_refresh_token(
                user_id=str(user.id),
                session_id=str(session_id),
            )
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "session_id": session_id,
                "user": user,
            }

        url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
        }
        body = {
            "email": email,
            "password": password,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=body, headers=headers)
            if response.status_code != 200:
                SupabaseAuthClient._handle_error(response)
            
            data = response.json()
            return data

    @staticmethod
    async def verify_access_token(token: str) -> Dict[str, Any]:
        """
        Verifies access token by fetching the user profile from Supabase Auth.
        """
        if is_supabase_mock():
            try:
                # Decode locally
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                return {
                    "id": payload.get("sub"),
                    "email": payload.get("email") or "mock@example.com",
                    "is_verified": True
                }
            except Exception:
                raise AuthenticationError(detail="Invalid or expired access token.", error_code="INVALID_ACCESS_TOKEN")

        url = f"{settings.SUPABASE_URL}/auth/v1/user"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {token}",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                SupabaseAuthClient._handle_error(response)
            
            data = response.json()
            # If email_confirmed_at exists, the user is verified
            is_verified = "email_confirmed_at" in data and data["email_confirmed_at"] is not None
            return {
                "id": data.get("id"),
                "email": data.get("email"),
                "is_verified": is_verified,
            }

    @staticmethod
    async def refresh_token(refresh_token: str) -> Dict[str, Any]:
        """
        Refreshes tokens using Supabase Auth refresh endpoint.
        """
        if is_supabase_mock():
            try:
                payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
                user_id = payload.get("sub")
                session_id = payload.get("session_id")
                new_access_token = create_access_token(
                    user_id=user_id,
                    role="Resident",
                    permissions=[],
                    session_id=session_id
                )
                new_refresh_token = create_refresh_token(
                    user_id=user_id,
                    session_id=session_id
                )
                return {
                    "access_token": new_access_token,
                    "refresh_token": new_refresh_token,
                }
            except Exception:
                raise AuthenticationError(detail="Invalid refresh token.")

        url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
        }
        body = {
            "refresh_token": refresh_token,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=body, headers=headers)
            if response.status_code != 200:
                SupabaseAuthClient._handle_error(response)
            
            return response.json()

    @staticmethod
    async def recover(email: str) -> None:
        """
        Sends a password reset email via Supabase.
        """
        if is_supabase_mock():
            logger.info(f"[MOCK AUTH] Initiated password recovery for: {email}")
            return

        url = f"{settings.SUPABASE_URL}/auth/v1/recover"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
        }
        body = {
            "email": email,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=body, headers=headers)
            if response.status_code not in (200, 204):
                SupabaseAuthClient._handle_error(response)

    @staticmethod
    async def resend_email(email: str, type: str = "signup") -> None:
        """
        Resends verification email or OTP via Supabase.
        """
        if is_supabase_mock():
            logger.info(f"[MOCK AUTH] Resent {type} email to: {email}")
            return

        url = f"{settings.SUPABASE_URL}/auth/v1/resend"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
        }
        body = {
            "email": email,
            "type": type,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=body, headers=headers)
            if response.status_code not in (200, 204):
                SupabaseAuthClient._handle_error(response)

    @staticmethod
    async def send_login_otp(email: str) -> None:
        """
        Sends a login OTP or magic link via Supabase.
        """
        if is_supabase_mock():
            logger.info(f"[MOCK AUTH] Sent login OTP to: {email}")
            return

        url = f"{settings.SUPABASE_URL}/auth/v1/otp"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
        }
        body = {
            "email": email,
            "create_user": False
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=body, headers=headers)
            if response.status_code not in (200, 204):
                SupabaseAuthClient._handle_error(response)

    @staticmethod
    async def verify_otp(email: str, token: str, type: str) -> Dict[str, Any]:
        """
        Verifies signup or recovery OTP using Supabase verify.
        types: 'signup', 'recovery', etc.
        """
        if is_supabase_mock():
            logger.info(f"[MOCK AUTH] Verifying OTP: {token} for {email} (type: {type})")
            return {
                "access_token": "mock-access-token",
                "refresh_token": "mock-refresh-token",
                "user": {"id": str(uuid.uuid4()), "email": email}
            }

        url = f"{settings.SUPABASE_URL}/auth/v1/verify"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
        }
        body = {
            "type": type,
            "email": email,
            "token": token,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=body, headers=headers)
            if response.status_code != 200:
                SupabaseAuthClient._handle_error(response)
            
            return response.json()

    @staticmethod
    async def logout(token: str, scope: str = "local") -> None:
        """
        Logs out a user session in Supabase.
        """
        if is_supabase_mock():
            logger.info(f"[MOCK AUTH] Logging out session (scope: {scope})")
            return

        url = f"{settings.SUPABASE_URL}/auth/v1/logout?scope={scope}"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {token}",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers)
            if response.status_code not in (200, 204, 201):
                SupabaseAuthClient._handle_error(response)

    @staticmethod
    async def update_user(token: str, body: Dict[str, Any]) -> Dict[str, Any]:
        """
        Updates logged-in user profile attributes, e.g., password.
        """
        if is_supabase_mock():
            logger.info(f"[MOCK AUTH] Updated user profile with: {body}")
            return {}

        url = f"{settings.SUPABASE_URL}/auth/v1/user"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.put(url, json=body, headers=headers)
            if response.status_code != 200:
                SupabaseAuthClient._handle_error(response)
            
            return response.json()
