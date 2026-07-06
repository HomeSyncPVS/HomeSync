import uuid
from typing import Optional
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.models.user import User
from app.models.role import Role
from app.models.society import Society
from app.models.wing import Wing
from app.models.floor import Floor
from app.models.flat import Flat
from app.models.family_member import FamilyMember
from app.models.vehicle import Vehicle
from app.models.emergency_contact import EmergencyContact
from app.models.notification import Notification
from app.core.constants import RoleEnum
from app.core.security import get_password_hash


async def get_auth_headers(client: AsyncClient, db, email: str, role_name: str, society_id: Optional[uuid.UUID] = None):
    """
    Helper to create a user and log them in to get authentication headers.
    """
    result = await db.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one_or_none()
    
    user = User(
        email=email,
        phone=f"+91{uuid.uuid4().int % 10000000000:010d}",
        hashed_password=get_password_hash("PasswordMatch!123"),
        full_name=f"{role_name} User",
        role_id=role.id,
        society_id=society_id,
        is_active=True,
        is_verified=True,
        approval_status="APPROVED" if role_name in [RoleEnum.SUPER_ADMIN.value, RoleEnum.ADMIN.value] else "PENDING",
    )
    db.add(user)
    await db.commit()

    payload = {
        "email": email,
        "password": "PasswordMatch!123",
        "device_type": "web",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, user


@pytest.mark.asyncio
async def test_resident_registration_and_approval(client: AsyncClient, db):
    # 1. Create a Society and Flat
    society = Society(
        name="Sunset Valley",
        region="Whitefield",
        city="Bengaluru",
        state="Karnataka",
        pincode="560066",
        phone="9876543222",
        email="sunset@society.com",
    )
    db.add(society)
    await db.commit()

    wing = Wing(society_id=society.id, name="Block A")
    db.add(wing)
    await db.commit()

    floor = Floor(wing_id=wing.id, floor_number=1)
    db.add(floor)
    await db.commit()

    flat = Flat(
        society_id=society.id,
        wing_id=wing.id,
        floor_id=floor.id,
        flat_number="101",
        flat_type="2BHK",
        flat_size=1100.0,
    )
    db.add(flat)
    await db.commit()

    # 2. Register a Resident via auth/register
    reg_payload = {
        "email": "resident1@homesync.com",
        "phone": "+919900887766",
        "password": "PasswordMatch!123",
        "full_name": "Resident One",
        "role": RoleEnum.RESIDENT.value,
        "society_id": str(society.id),
        "flat_number": "101",
        "wing_name": "Block A",
        "floor_number": 1,
    }
    response = await client.post("/api/v1/auth/register", json=reg_payload)
    assert response.status_code == 201
    user_data = response.json()["user"]
    assert user_data["approval_status"] == "PENDING"
    resident_id = uuid.UUID(user_data["id"])

    # Associate flat to the user manually for the test if registration doesn't do it
    result = await db.execute(select(User).where(User.id == resident_id))
    resident_obj = result.scalar_one_or_none()
    resident_obj.flat_id = flat.id
    await db.commit()

    # 3. Create Admin for Society A
    admin_headers, admin_user = await get_auth_headers(
        client, db, "admin-sunset@society.com", RoleEnum.ADMIN.value, society_id=society.id
    )

    # 4. Search Residents (Pending)
    search_response = await client.get(
        f"/api/v1/residents?approval_status=PENDING", headers=admin_headers
    )
    assert search_response.status_code == 200
    assert len(search_response.json()) >= 1
    assert search_response.json()[0]["email"] == "resident1@homesync.com"

    # 5. Approve Resident
    approve_payload = {"status": "APPROVED"}
    approve_response = await client.put(
        f"/api/v1/residents/{resident_id}/approve", json=approve_payload, headers=admin_headers
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["approval_status"] == "APPROVED"

    # Verify Flat occupancy status has changed
    await db.refresh(flat)
    assert flat.occupancy_status == "OCCUPIED_OWNER"

    # 6. Reject Resident request (for another user)
    # Register another resident
    reg_payload2 = dict(reg_payload, email="resident2@homesync.com", phone="+919900887755")
    response2 = await client.post("/api/v1/auth/register", json=reg_payload2)
    assert response2.status_code == 201
    resident_id2 = uuid.UUID(response2.json()["user"]["id"])

    # Reject
    reject_response = await client.put(
        f"/api/v1/residents/{resident_id2}/approve", json={"status": "REJECTED"}, headers=admin_headers
    )
    assert reject_response.status_code == 200
    assert reject_response.json()["approval_status"] == "REJECTED"


@pytest.mark.asyncio
async def test_resident_profile_and_dashboard(client: AsyncClient, db):
    # 1. Create Society & User
    society = Society(
        name="Pine Crest",
        region="Whitefield",
        city="Bengaluru",
        state="Karnataka",
        pincode="560066",
        phone="9876543223",
        email="pinecrest@society.com",
    )
    db.add(society)
    await db.commit()

    resident_headers, resident_user = await get_auth_headers(
        client, db, "resident-pine@society.com", RoleEnum.RESIDENT.value, society_id=society.id
    )

    # 2. Get Profile
    profile_response = await client.get("/api/v1/residents/me/profile", headers=resident_headers)
    assert profile_response.status_code == 200
    assert profile_response.json()["email"] == "resident-pine@society.com"

    # 3. Get Dashboard Statistics
    dashboard_response = await client.get("/api/v1/residents/me/dashboard", headers=resident_headers)
    assert dashboard_response.status_code == 200
    stats = dashboard_response.json()
    assert "unpaid_bills_count" in stats
    assert "active_complaints_count" in stats
    assert "recent_notices_count" in stats
    assert "upcoming_events_count" in stats


@pytest.mark.asyncio
async def test_family_members_crud(client: AsyncClient, db):
    # 1. Setup User
    society = Society(
        name="Oak Gardens",
        region="Whitefield",
        city="Bengaluru",
        state="Karnataka",
        pincode="560066",
        phone="9876543224",
        email="oak@society.com",
    )
    db.add(society)
    await db.commit()

    resident_headers, resident_user = await get_auth_headers(
        client, db, "res-family@society.com", RoleEnum.RESIDENT.value, society_id=society.id
    )

    # 2. Add Family Member
    payload = {
        "full_name": "Jane Doe",
        "relationship": "Spouse",
        "phone": "+919999988888",
        "email": "jane@doe.com",
    }
    response = await client.post("/api/v1/residents/me/family", json=payload, headers=resident_headers)
    assert response.status_code == 201
    member_data = response.json()
    assert member_data["full_name"] == "Jane Doe"
    member_id = uuid.UUID(member_data["id"])

    # 3. Get Family Members
    get_response = await client.get("/api/v1/residents/me/family", headers=resident_headers)
    assert get_response.status_code == 200
    assert len(get_response.json()) == 1

    # 4. Update Family Member
    update_payload = {"full_name": "Jane Smith"}
    update_response = await client.put(
        f"/api/v1/residents/me/family/{member_id}", json=update_payload, headers=resident_headers
    )
    assert update_response.status_code == 200
    assert update_response.json()["full_name"] == "Jane Smith"

    # 5. Delete Family Member
    delete_response = await client.delete(
        f"/api/v1/residents/me/family/{member_id}", headers=resident_headers
    )
    assert delete_response.status_code == 200

    # Get again, should be empty
    get_response2 = await client.get("/api/v1/residents/me/family", headers=resident_headers)
    assert len(get_response2.json()) == 0


@pytest.mark.asyncio
async def test_vehicles_crud(client: AsyncClient, db):
    # 1. Setup User
    society = Society(
        name="Maple Leaf",
        region="Whitefield",
        city="Bengaluru",
        state="Karnataka",
        pincode="560066",
        phone="9876543225",
        email="maple@society.com",
    )
    db.add(society)
    await db.commit()

    resident_headers, resident_user = await get_auth_headers(
        client, db, "res-vehicle@society.com", RoleEnum.RESIDENT.value, society_id=society.id
    )

    # 2. Add Vehicle
    payload = {
        "vehicle_number": "MH12AB1234",
        "vehicle_type": "FOUR_WHEELER",
        "make_model": "Tesla Model 3",
        "parking_slot": "P-45",
    }
    response = await client.post("/api/v1/residents/me/vehicles", json=payload, headers=resident_headers)
    assert response.status_code == 201
    vehicle_data = response.json()
    assert vehicle_data["vehicle_number"] == "MH12AB1234"
    vehicle_id = uuid.UUID(vehicle_data["id"])

    # 3. Get Vehicles
    get_response = await client.get("/api/v1/residents/me/vehicles", headers=resident_headers)
    assert get_response.status_code == 200
    assert len(get_response.json()) == 1

    # 4. Update Vehicle
    update_payload = {"parking_slot": "P-46"}
    update_response = await client.put(
        f"/api/v1/residents/me/vehicles/{vehicle_id}", json=update_payload, headers=resident_headers
    )
    assert update_response.status_code == 200
    assert update_response.json()["parking_slot"] == "P-46"

    # 5. Delete Vehicle
    delete_response = await client.delete(
        f"/api/v1/residents/me/vehicles/{vehicle_id}", headers=resident_headers
    )
    assert delete_response.status_code == 200


@pytest.mark.asyncio
async def test_emergency_contacts_and_notifications(client: AsyncClient, db):
    # 1. Setup User and Admin
    society = Society(
        name="Willow Woods",
        region="Whitefield",
        city="Bengaluru",
        state="Karnataka",
        pincode="560066",
        phone="9876543226",
        email="willow@society.com",
    )
    db.add(society)
    await db.commit()

    admin_headers, admin_user = await get_auth_headers(
        client, db, "admin-willow@society.com", RoleEnum.ADMIN.value, society_id=society.id
    )
    resident_headers, resident_user = await get_auth_headers(
        client, db, "res-willow@society.com", RoleEnum.RESIDENT.value, society_id=society.id
    )

    # 2. Admin adds Emergency Contact
    contact_payload = {
        "name": "Gate 1 Security",
        "role_or_service": "Security",
        "phone": "+919876543211",
        "email": "security@willow.com",
    }
    response = await client.post(
        "/api/v1/residents/emergency-contacts", json=contact_payload, headers=admin_headers
    )
    assert response.status_code == 201
    contact_id = uuid.UUID(response.json()["id"])

    # 3. Resident retrieves Emergency Contacts
    contacts_response = await client.get(
        "/api/v1/residents/me/emergency-contacts", headers=resident_headers
    )
    assert contacts_response.status_code == 200
    assert len(contacts_response.json()) >= 1
    assert contacts_response.json()[0]["name"] == "Gate 1 Security"

    # 4. Seed and retrieve Notifications
    notification = Notification(
        user_id=resident_user.id,
        title="Welcome Notice",
        body="Welcome to Willow Woods!",
        notification_type="GENERAL",
    )
    db.add(notification)
    await db.commit()

    notif_response = await client.get(
        "/api/v1/residents/me/notifications?unread_only=true", headers=resident_headers
    )
    assert notif_response.status_code == 200
    assert len(notif_response.json()) == 1
    notif_id = uuid.UUID(notif_response.json()[0]["id"])

    # Mark as read
    read_response = await client.put(
        f"/api/v1/residents/me/notifications/{notif_id}/read", headers=resident_headers
    )
    assert read_response.status_code == 200
    assert read_response.json()["read_at"] is not None