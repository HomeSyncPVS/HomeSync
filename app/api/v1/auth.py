import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_db,
    get_current_user,
    get_current_active_user,
    get_current_verified_user,
    PermissionChecker,
)
from app.core.config import settings
from app.core.constants import OtpPurpose, TokenType, RoleEnum
from app.core.security import verify_token, get_password_hash
from app.exceptions.custom import (
    AuthenticationError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.models.user import User
from app.models.device import Device
from app.middleware.rate_limit import RateLimiter
from app.repositories.user import UserRepository
from app.repositories.session import SessionRepository
from app.repositories.device import DeviceRepository
from app.repositories.role import RoleRepository
from app.schemas.common import SuccessResponse, ErrorResponse
from app.schemas.auth import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    SendOtpRequest,
    VerifyOtpRequest,
    RefreshTokenRequest,
    UserResponse,
    SessionResponse,
    UserUpdateRequest,
    TokenValidationResponse,
)
from app.schemas.device import DeviceRegisterRequest, DeviceResponse
from app.services.auth import AuthService
from app.services.otp import OTPService
from app.services.user import UserService

router = APIRouter(prefix="/auth", tags=["Authentication"])
user_repo = UserRepository()
session_repo = SessionRepository()
device_repo = DeviceRepository()
role_repo = RoleRepository()


# ==========================================
# REGISTER & LOGIN
# ==========================================

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Registers a new user inside the HomeSync platform with a default 'Resident' role.",
    responses={
        201: {"model": RegisterResponse, "description": "User created successfully"},
        400: {"model": ErrorResponse, "description": "Validation error"},
        409: {"model": ErrorResponse, "description": "Email or Phone already in use"},
    },
)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await AuthService.register_user(db, data)
    
    # Automatically send verification email
    try:
        await AuthService.send_email_verification(db, user)
    except Exception:
        # Don't fail the registration if sending email fails
        pass
        
    return RegisterResponse(
        message="Registration successful. Verification email has been sent.",
        user=UserResponse.model_validate(user)
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="User Login",
    description="Log in using credentials and generate Access & Refresh token binding the session to current device.",
    dependencies=[Depends(RateLimiter(times=5, seconds=60))],
    responses={
        200: {"model": LoginResponse, "description": "Login successful"},
        401: {"model": ErrorResponse, "description": "Invalid credentials or account locked"},
    },
)
async def login(
    request: Request,
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    result = await AuthService.login_user(db, data, ip_address, user_agent)
    return LoginResponse(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        session_id=result["session_id"],
        user=UserResponse.model_validate(result["user"])
    )


# ==========================================
# OTP ENDPOINTS
# ==========================================

@router.post(
    "/send-otp",
    response_model=SuccessResponse,
    summary="Send OTP Code",
    description="Generate and send an OTP code via Email or SMS to a specified target destination.",
    dependencies=[Depends(RateLimiter(times=3, seconds=60))],
)
async def send_otp(data: SendOtpRequest, db: AsyncSession = Depends(get_db)):
    await OTPService.generate_and_send_otp(db, data.target, data.purpose.value)
    return SuccessResponse(message="OTP sent successfully.")


@router.post(
    "/verify-otp",
    response_model=SuccessResponse,
    summary="Verify OTP Code",
    description="Verify an OTP code for a user verification step (registration, password reset, etc.).",
    dependencies=[Depends(RateLimiter(times=5, seconds=60))],
)
async def verify_otp(data: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    await OTPService.verify_otp(db, data.target, data.code, data.purpose.value)
    return SuccessResponse(message="OTP verified successfully.")


@router.post(
    "/resend-otp",
    response_model=SuccessResponse,
    summary="Resend OTP Code",
    description="Resend a fresh OTP to the destination (essentially duplicates /send-otp functionality).",
    dependencies=[Depends(RateLimiter(times=3, seconds=60))],
)
async def resend_otp(data: SendOtpRequest, db: AsyncSession = Depends(get_db)):
    await OTPService.generate_and_send_otp(db, data.target, data.purpose.value)
    return SuccessResponse(message="OTP resent successfully.")


# ==========================================
# EMAIL VERIFICATION
# ==========================================

@router.post(
    "/send-email-verification",
    response_model=SuccessResponse,
    summary="Request Verification Email",
    description="Trigger verification process by sending a signed email verification link to authenticated user.",
)
async def send_email_verification(
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    await AuthService.send_email_verification(db, current_user)
    return SuccessResponse(message="Verification email sent.")


@router.post(
    "/verify-email",
    response_model=SuccessResponse,
    summary="Verify Email Address",
    description="Completes email verification using a valid verification token.",
)
async def verify_email(
    token: str = Query(..., description="Email verification token"),
    db: AsyncSession = Depends(get_db)
):
    await AuthService.verify_email(db, token)
    return SuccessResponse(message="Email address verified successfully.")


# ==========================================
# PASSWORD MANAGEMENT
# ==========================================

@router.post(
    "/forgot-password",
    response_model=SuccessResponse,
    summary="Forgot Password",
    description="Initiates password reset flow by sending a verification reset link to the email if user exists.",
    dependencies=[Depends(RateLimiter(times=3, seconds=60))],
)
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.request_password_reset(db, data.email)
    return SuccessResponse(message="If the email exists, a password reset link has been sent.")


@router.post(
    "/reset-password",
    response_model=SuccessResponse,
    summary="Reset Password",
    description="Reset password using the secret token received in email.",
)
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.reset_password(db, data.token, data.new_password)
    return SuccessResponse(message="Password reset successfully. Please log in with your new password.")


@router.post(
    "/change-password",
    response_model=SuccessResponse,
    summary="Change Password",
    description="Changes password for current user. Revokes all other active sessions.",
)
async def change_password(
    data: ChangePasswordRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    await AuthService.change_password(db, current_user, data)
    return SuccessResponse(message="Password changed successfully. All other devices have been logged out.")


# ==========================================
# TOKEN OPERATIONS & REFRESH ROTATION
# ==========================================

@router.post(
    "/refresh-token",
    response_model=LoginResponse,
    summary="Refresh Access Token",
    description="Perform Refresh Token Rotation to fetch a new access token and rotated refresh token.",
    responses={
        200: {"description": "Access token refreshed"},
        401: {"model": ErrorResponse, "description": "Invalid/Expired refresh token or token reuse breach"},
    },
)
async def refresh_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await AuthService.refresh_access_token(db, data.refresh_token)
    
    # Extract user payload info
    decoded = verify_token(result["access_token"])
    user_id = decoded.get("sub")
    user = await user_repo.get(db, uuid.UUID(user_id))
    
    return LoginResponse(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        session_id=uuid.UUID(decoded.get("session_id")),
        user=UserResponse.model_validate(user)
    )


@router.post(
    "/logout",
    response_model=SuccessResponse,
    summary="Log Out Current Session",
    description="Revokes current refresh token and deactivates session.",
)
async def logout(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.logout_session(db, data.refresh_token)
    return SuccessResponse(message="Logged out successfully.")


@router.post(
    "/logout-all",
    response_model=SuccessResponse,
    summary="Log Out All Sessions",
    description="Revokes all sessions across all devices for the current user.",
)
async def logout_all(
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    await AuthService.logout_all_sessions(db, current_user.id)
    return SuccessResponse(message="Successfully logged out of all active sessions.")


# ==========================================
# USER PROFILE OPERATIONS
# ==========================================

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user details",
    description="Retrieves profile information of the currently authenticated user.",
)
async def get_me(current_user=Depends(get_current_active_user)):
    return UserResponse.model_validate(current_user)


@router.put(
    "/profile",
    response_model=UserResponse,
    summary="Update User Profile",
    description="Updates user profile attributes (such as full name and phone number).",
)
async def update_profile(
    data: UserUpdateRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    user = await UserService.update_profile(db, current_user, data)
    return UserResponse.model_validate(user)


@router.post(
    "/profile-image",
    response_model=UserResponse,
    summary="Upload profile image",
    description="Uploads a new user profile image file and updates the profile link.",
)
async def upload_profile_image(
    file: UploadFile = File(..., description="File to upload as profile picture"),
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    file_bytes = await file.read()
    user = await UserService.update_profile_image(
        db, current_user, file_bytes, file.filename, file.content_type
    )
    return UserResponse.model_validate(user)


@router.delete(
    "/profile-image",
    response_model=UserResponse,
    summary="Delete profile image",
    description="Deletes current profile image from bucket and updates user record.",
)
async def delete_profile_image(
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    user = await UserService.delete_profile_image(db, current_user)
    return UserResponse.model_validate(user)


# ==========================================
# SESSION MANAGEMENT
# ==========================================

@router.get(
    "/sessions",
    response_model=List[SessionResponse],
    summary="List active sessions",
    description="Retrieves a list of all active sessions bound to the current user.",
)
async def get_sessions(
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    sessions = await session_repo.get_active_sessions_by_user_id(db, current_user.id)
    return [SessionResponse.model_validate(s) for s in sessions]


@router.delete(
    "/sessions/{id}",
    response_model=SuccessResponse,
    summary="Terminate session",
    description="Revokes a specific session by its ID. Users can terminate their own sessions, Admins can terminate any session.",
)
async def terminate_session(
    id: uuid.UUID,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    session = await session_repo.get(db, id)
    if not session:
        raise NotFoundError(detail="Session not found.")
        
    # Security access check
    if session.user_id != current_user.id and current_user.role.name not in (RoleEnum.SUPER_ADMIN.value, RoleEnum.ADMIN.value):
        raise ForbiddenError(detail="Access denied to terminate this session.")
        
    await session_repo.revoke_session(db, id)
    return SuccessResponse(message="Session terminated successfully.")


# ==========================================
# SOCIAL OAUTH (GOOGLE & APPLE)
# ==========================================

@router.get(
    "/google/login",
    summary="Google OAuth Initiate",
    description="Redirects user to Google OAuth2 authentication flow.",
)
async def google_login():
    # Return mock authorization redirect url
    redirect_url = "https://accounts.google.com/o/oauth2/v2/auth"
    return {"login_url": redirect_url}


@router.get(
    "/google/callback",
    response_model=LoginResponse,
    summary="Google OAuth Callback",
    description="Callback handler for Google OAuth. Processes auth code and logs in/registers user.",
)
async def google_callback(
    code: str = Query(..., description="Google Authorization Code"),
    db: AsyncSession = Depends(get_db)
):
    # Mock authenticating Google profile
    mock_email = "oauth-google-user@homesync.com"
    user = await user_repo.get_by_email(db, mock_email)
    if not user:
        # Auto register mock OAuth user
        role = await role_repo.get_by_name(db, RoleEnum.RESIDENT.value)
        hashed_pwd = get_password_hash("OAuthSecureDefaultPassword!12")
        user = User(
            email=mock_email,
            full_name="Google OAuth User",
            hashed_password=hashed_pwd,
            role_id=role.id,
            is_active=True,
            is_verified=True,
        )
        user = await user_repo.create(db, obj_in=user)
        await db.flush()

    # Log in user
    login_data = LoginRequest(email=user.email, password="OAuthSecureDefaultPassword!12")
    result = await AuthService.login_user(db, login_data, "127.0.0.1", "Google OAuth Agent")
    return LoginResponse(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        session_id=result["session_id"],
        user=UserResponse.model_validate(result["user"])
    )


@router.get(
    "/apple/login",
    summary="Apple OAuth Initiate",
    description="Redirects user to Apple Identity Provider authentication flow.",
)
async def apple_login():
    redirect_url = "https://appleid.apple.com/auth/authorize"
    return {"login_url": redirect_url}


@router.get(
    "/apple/callback",
    response_model=LoginResponse,
    summary="Apple OAuth Callback",
    description="Callback handler for Apple Sign In.",
)
async def apple_callback(
    code: str = Query(..., description="Apple authorization code"),
    db: AsyncSession = Depends(get_db)
):
    # Mock authenticating Apple profile
    mock_email = "oauth-apple-user@homesync.com"
    user = await user_repo.get_by_email(db, mock_email)
    if not user:
        # Auto register mock OAuth user
        role = await role_repo.get_by_name(db, RoleEnum.RESIDENT.value)
        hashed_pwd = get_password_hash("OAuthSecureDefaultPassword!12")
        user = User(
            email=mock_email,
            full_name="Apple OAuth User",
            hashed_password=hashed_pwd,
            role_id=role.id,
            is_active=True,
            is_verified=True,
        )
        user = await user_repo.create(db, obj_in=user)
        await db.flush()

    # Log in user
    login_data = LoginRequest(email=user.email, password="OAuthSecureDefaultPassword!12")
    result = await AuthService.login_user(db, login_data, "127.0.0.1", "Apple OAuth Agent")
    return LoginResponse(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        session_id=result["session_id"],
        user=UserResponse.model_validate(result["user"])
    )


# ==========================================
# DEVICE REGISTRATION
# ==========================================

@router.post(
    "/device/register",
    response_model=DeviceResponse,
    summary="Register active device",
    description="Binds current user to a push token notification device.",
)
async def register_device(
    data: DeviceRegisterRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    # Check if device already registered for this user with same push token
    device_obj = None
    if data.push_token:
        device_obj = await device_repo.get_by_user_and_token(db, current_user.id, data.push_token)
        
    if not device_obj:
        device_obj = Device(
            user_id=current_user.id,
            push_token=data.push_token,
            device_type=data.device_type,
            os_version=data.os_version,
            device_model=data.device_model,
            is_active=True
        )
        await device_repo.create(db, obj_in=device_obj)
        await db.flush()
    else:
        # Reactive device if inactive
        device_obj.is_active = True
        device_obj.os_version = data.os_version
        device_obj.device_model = data.device_model
        db.add(device_obj)
        await db.flush()
        
    return DeviceResponse.model_validate(device_obj)


@router.delete(
    "/device/{id}",
    response_model=SuccessResponse,
    summary="Unregister device",
    description="Deactivates a registered push device by ID.",
)
async def unregister_device(
    id: uuid.UUID,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    device = await device_repo.get(db, id)
    if not device:
        raise NotFoundError(detail="Device not found.")
        
    if device.user_id != current_user.id:
        raise ForbiddenError(detail="Access denied. Cannot delete another user's device registration.")
        
    await device_repo.deactivate_device(db, id)
    return SuccessResponse(message="Device unregistered successfully.")


# ==========================================
# AVAILABILITY CHECKS
# ==========================================

@router.get(
    "/check-email",
    response_model=SuccessResponse,
    summary="Check email availability",
    description="Checks whether a given email address is already taken in the database.",
)
async def check_email(
    email: str = Query(..., description="Email address to check"),
    db: AsyncSession = Depends(get_db)
):
    user = await user_repo.get_by_email(db, email)
    if user:
        raise ConflictError(detail="Email is already taken.", error_code="EMAIL_TAKEN")
    return SuccessResponse(message="Email is available.")


@router.get(
    "/check-phone",
    response_model=SuccessResponse,
    summary="Check phone availability",
    description="Checks whether a phone number is already registered in the database.",
)
async def check_phone(
    phone: str = Query(..., description="Phone number to check"),
    db: AsyncSession = Depends(get_db)
):
    user = await user_repo.get_by_phone(db, phone)
    if user:
        raise ConflictError(detail="Phone number is already taken.", error_code="PHONE_TAKEN")
    return SuccessResponse(message="Phone number is available.")


# ==========================================
# SECURITY & VALIDATION ADMIN TOOLS
# ==========================================

@router.post(
    "/validate-token",
    response_model=TokenValidationResponse,
    summary="Validate Access Token",
    description="Verifies if the access token signature is valid and decodes its payload.",
)
async def validate_token(
    data: RefreshTokenRequest, # Reusing input structure which just takes a token string
):
    # Rename for readability
    token_str = data.refresh_token
    payload = verify_token(token_str)
    if not payload:
        return TokenValidationResponse(valid=False)
    return TokenValidationResponse(valid=True, payload=payload)


@router.post(
    "/revoke-token",
    response_model=SuccessResponse,
    summary="Revoke refresh token",
    description="Revokes a refresh token directly using its value (marks session inactive).",
)
async def revoke_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    await AuthService.logout_session(db, data.refresh_token)
    return SuccessResponse(message="Token revoked successfully.")


@router.delete(
    "/delete-account",
    response_model=SuccessResponse,
    summary="Delete Own User Account",
    description="Deletes currently authenticated user account and all cascading data from the database.",
)
async def delete_account(
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    await UserService.delete_user_account(db, current_user)
    return SuccessResponse(message="Account deleted successfully.")
