import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.models.user import User
from app.models.role import Role
from app.core.constants import RoleEnum
from app.core.security import get_password_hash


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient, db):
    """
    Test user registration.
    """
    email = "register-test-new@homesync.com"
    payload = {
        "email": email,
        "phone": "+1234567891",
        "password": "SecurePassword!123",
        "full_name": "Register Test User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["user"]["email"] == email

    # Verify user exists in database
    query = select(User).where(User.email == email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.full_name == "Register Test User"


@pytest.mark.asyncio
async def test_login_user(client: AsyncClient, db):
    """
    Test login and JWT generation.
    """
    email = "login-test-new@homesync.com"
    
    # Check if roles are seeded
    res_role = await db.scalar(select(Role).where(Role.name == RoleEnum.RESIDENT.value))
    if not res_role:
        res_role = Role(name=RoleEnum.RESIDENT.value, description="Resident")
        db.add(res_role)
        await db.flush()

    hashed_pwd = get_password_hash("PasswordMatch!123")
    user = User(
        email=email,
        phone="+9876543211",
        hashed_password=hashed_pwd,
        full_name="Login Test User",
        role_id=res_role.id,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()  # Commit so the separate client request session can see the record

    payload = {
        "email": email,
        "password": "PasswordMatch!123",
        "device_type": "web",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == email


@pytest.mark.asyncio
async def test_check_email_availability(client: AsyncClient, db):
    """
    Test checking email availability.
    """
    # 1. Unique email should return 200
    response = await client.get("/api/v1/auth/check-email?email=unique-email-avail@homesync.com")
    assert response.status_code == 200
    assert response.json()["success"] is True

    # 2. Add a user to database and commit to test taken email (409 conflict)
    email = "register-test-new@homesync.com"
    res_role = await db.scalar(select(Role).where(Role.name == RoleEnum.RESIDENT.value))
    user = User(
        email=email,
        phone="+1234567891",
        hashed_password=get_password_hash("SecurePassword!123"),
        full_name="Register Test User",
        role_id=res_role.id,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()

    response = await client.get(f"/api/v1/auth/check-email?email={email}")
    assert response.status_code == 409
    assert response.json()["success"] is False


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient):
    """
    Test me endpoint blocks requests without token.
    """
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_profile_update(client: AsyncClient, db):
    """
    Test updating user details when logged in.
    """
    email = "profile-test@homesync.com"
    res_role = await db.scalar(select(Role).where(Role.name == RoleEnum.RESIDENT.value))
    hashed_pwd = get_password_hash("PasswordMatch!123")
    user = User(
        email=email,
        phone="+9876543212",
        hashed_password=hashed_pwd,
        full_name="Old Name",
        role_id=res_role.id,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()  # Commit so the login endpoint session can see the record

    # Login
    login_payload = {
        "email": email,
        "password": "PasswordMatch!123",
        "device_type": "web",
    }
    login_response = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    token = login_response.json()["access_token"]

    # Put update
    headers = {"Authorization": f"Bearer {token}"}
    update_payload = {"full_name": "New Name", "phone": "+9876543213"}
    update_response = await client.put("/api/v1/auth/profile", json=update_payload, headers=headers)
    assert update_response.status_code == 200
    assert update_response.json()["full_name"] == "New Name"
    assert update_response.json()["phone"] == "+9876543213"


from unittest.mock import patch
from app.exceptions.custom import ValidationError, AuthenticationError

@pytest.mark.asyncio
async def test_register_self_healing_success(client: AsyncClient, db):
    """
    Test that registration self-heals when a user exists in Supabase but not locally,
    provided they supply the correct password.
    """
    email = "heal-success@homesync.com"
    payload = {
        "email": email,
        "phone": "+1999888777",
        "password": "CorrectPassword123!",
        "full_name": "Healed User",
    }

    mock_user_id = "00000000-0000-0000-0000-000000000001"
    mock_supabase_user = {
        "access_token": "mock-token",
        "refresh_token": "mock-refresh",
        "user": {
            "id": mock_user_id,
            "email": email,
            "email_confirmed_at": "2026-07-14T11:00:00Z"
        }
    }

    with patch("app.utils.supabase_auth.SupabaseAuthClient.signup_user") as mock_signup, \
         patch("app.utils.supabase_auth.SupabaseAuthClient.login_user") as mock_login:
        
        # 1. Signup raises "User already registered" error
        mock_signup.side_effect = ValidationError("Supabase Authentication error: User already registered")
        # 2. Login succeeds (simulating correct password)
        mock_login.return_value = mock_supabase_user

        response = await client.post("/api/v1/auth/register", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["user"]["email"] == email

        # Verify user now exists in local DB
        query = select(User).where(User.email == email)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        assert user is not None
        assert str(user.id) == mock_user_id
        assert user.is_verified is True


@pytest.mark.asyncio
async def test_register_self_healing_failure(client: AsyncClient, db):
    """
    Test that registration fails with Conflict (409) if a user exists in Supabase
    but supplies an incorrect password.
    """
    email = "heal-fail@homesync.com"
    payload = {
        "email": email,
        "phone": "+1999888776",
        "password": "WrongPassword123!",
        "full_name": "Failed Healed User",
    }

    with patch("app.utils.supabase_auth.SupabaseAuthClient.signup_user") as mock_signup, \
         patch("app.utils.supabase_auth.SupabaseAuthClient.login_user") as mock_login:
        
        # 1. Signup raises "User already registered" error
        mock_signup.side_effect = ValidationError("Supabase Authentication error: User already registered")
        # 2. Login fails (simulating incorrect password)
        mock_login.side_effect = AuthenticationError("Invalid email or password.")

        response = await client.post("/api/v1/auth/register", json=payload)
        
        assert response.status_code == 409
        assert response.json()["success"] is False

