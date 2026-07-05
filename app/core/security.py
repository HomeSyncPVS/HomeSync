from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import hashlib

from app.core.config import settings
from app.core.constants import TokenType

ph = PasswordHasher()

ALGORITHM = "HS256"


def get_password_hash(password: str) -> str:
    """
    Generate Argon2 hash of a password.
    """
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against an Argon2 hash.
    """
    try:
        return ph.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False


def hash_token(token: str) -> str:
    """
    Generate a SHA-256 hash of a token for secure database storage.
    """
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(
    user_id: str,
    role: str,
    permissions: List[str],
    session_id: str,
    society_id: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT access token.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {
        "sub": user_id,
        "user_id": user_id,
        "society_id": society_id,
        "role": role,
        "permissions": permissions,
        "session_id": session_id,
        "token_type": TokenType.ACCESS.value,
        "exp": expire,
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(
    user_id: str,
    session_id: str,
    token_version: int = 1,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT refresh token.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

    to_encode = {
        "sub": user_id,
        "session_id": session_id,
        "token_version": token_version,
        "token_type": TokenType.REFRESH.value,
        "exp": expire,
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode a JWT.
    Returns payload if valid, otherwise None.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
