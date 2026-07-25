from datetime import datetime
import re
from typing import Optional, List, Any
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.core.constants import OtpPurpose, RoleEnum
from app.schemas.role import RoleResponse


def validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
        raise ValueError("Password must contain at least one special character")
    return v


class RegisterRequest(BaseModel):
    email: EmailStr
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$", description="E.164 phone format")
    password: str
    full_name: str = Field(..., min_length=2, max_length=100)
    role: RoleEnum = Field(default=RoleEnum.RESIDENT, description="Selected role (Resident, Society Admin, Committee Member)")
    society_id: Optional[uuid.UUID] = None
    
    # Optional fields for entering new/existing Society details
    society_name: Optional[str] = Field(None, max_length=255)
    society_address: Optional[str] = Field(None, max_length=512)
    society_region: Optional[str] = Field(None, max_length=100)
    society_city: Optional[str] = Field(None, max_length=100)
    society_state: Optional[str] = Field(None, max_length=100)
    society_pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    society_phone: Optional[str] = Field(None, max_length=50)
    society_email: Optional[str] = Field(None, max_length=255)

    # Optional fields for Resident's Flat details
    flat_number: Optional[str] = Field(None, max_length=50)
    flat_type: Optional[str] = Field(None, max_length=50)
    flat_size: Optional[float] = None
    wing_name: Optional[str] = Field(None, max_length=50)
    floor_number: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    phone: Optional[str] = None
    full_name: str
    role_id: uuid.UUID
    society_id: Optional[uuid.UUID] = None
    flat_id: Optional[uuid.UUID] = None
    profile_image_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    approval_status: str
    created_at: datetime


class RegisterResponse(BaseModel):
    success: bool = True
    message: str
    user: UserResponse


class LoginRequest(BaseModel):
    email: str = Field(..., description="Email or Phone number used for login")
    password: str
    device_type: str = Field("web", description="e.g. ios, android, web")
    push_token: Optional[str] = None
    device_model: Optional[str] = None
    os_version: Optional[str] = None


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    device_id: Optional[uuid.UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_active: bool
    expires_at: datetime
    created_at: datetime


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    session_id: uuid.UUID
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="Reset token received via email")
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class SendOtpRequest(BaseModel):
    target: str = Field(..., description="Email address or Phone number to send OTP to")
    purpose: OtpPurpose

    @field_validator("purpose", mode="before")
    @classmethod
    def normalize_purpose(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower().strip()
        return v


class VerifyOtpRequest(BaseModel):
    target: str = Field(..., description="Email address or Phone number OTP was sent to")
    code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")
    purpose: OtpPurpose

    @field_validator("purpose", mode="before")
    @classmethod
    def normalize_purpose(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower().strip()
        return v


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    society_id: Optional[uuid.UUID] = None
    flat_id: Optional[uuid.UUID] = None


class TokenValidationResponse(BaseModel):
    valid: bool
    payload: Optional[dict] = None


class VerifyOtpResponse(BaseModel):
    success: bool = True
    message: str
    token: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    session_id: Optional[uuid.UUID] = None
    user: Optional[UserResponse] = None
