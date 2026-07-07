import uuid
import pytest
from typing import Optional
from httpx import AsyncClient
from sqlalchemy import select
from app.models.user import User
from app.models.role import Role
from app.models.society import Society, SocietySettings
from app.models.wing import Wing
from app.models.floor import Floor
from app.models.flat import Flat
from app.core.constants import RoleEnum
from app.core.security import get_password_hash


async def get_auth_headers(client: AsyncClient, db, email: str, role_name: str, society_id: Optional[uuid.UUID] = None):
    """
    Helper to create a user and log them in to get authentication headers.
    """
    # Fetch the pre-seeded role
    result = await db.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one_or_none()
    
    # Create the user
    user = User(
        email=email,
        phone=f"+91{uuid.uuid4().int % 10000000000:010d}", # unique valid phone
        hashed_password=get_password_hash("PasswordMatch!123"),
        full_name=f"{role_name} User",
        role_id=role.id,
        society_id=society_id,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()

    # Log in
    payload = {
        "email": email,
        "password": "PasswordMatch!123",
        "device_type": "web",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200, f"Login failed for {email}: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, user


@pytest.mark.asyncio
async def test_society_crud_and_validation(client: AsyncClient, db):
    """
    Test creation, validation, updating, and deletion of a society.
    """
    super_admin_headers, _ = await get_auth_headers(
        client, db, "super-admin@homesync.com", RoleEnum.SUPER_ADMIN.value
    )

    # 1. Create a Society (Success)
    payload = {
        "name": "Emerald Enclave",
        "address": "456 Lotus Road",
        "region": "Indiranagar",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560038",  # Valid 6 digit Indian pin
        "phone": "9876543210", # Valid 10 digit Indian phone
        "email": "contact@emeraldenclave.com",
    }
    response = await client.post("/api/v1/societies", json=payload, headers=super_admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Emerald Enclave"
    society_id = uuid.UUID(data["id"])

    # Verify that default settings were auto-created
    settings_response = await client.get(f"/api/v1/societies/{society_id}/settings", headers=super_admin_headers)
    assert settings_response.status_code == 200
    assert settings_response.json()["maintenance_due_day"] == 5

    # 2. Input Validation Tests
    # A. Invalid Pincode (starts with 0 or length != 6)
    bad_pincode = dict(payload, pincode="012345", name="Pincode Society")
    response = await client.post("/api/v1/societies", json=bad_pincode, headers=super_admin_headers)
    assert response.status_code == 422

    # B. Invalid Phone
    bad_phone = dict(payload, phone="12345", name="Phone Society")
    response = await client.post("/api/v1/societies", json=bad_phone, headers=super_admin_headers)
    assert response.status_code == 422

    # C. Duplicate name inside same region
    response = await client.post("/api/v1/societies", json=payload, headers=super_admin_headers)
    assert response.status_code == 409

    # 3. Read Society details
    response = await client.get(f"/api/v1/societies/{society_id}", headers=super_admin_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Emerald Enclave"

    # 4. Update Society details
    update_payload = {"name": "Emerald Gardens"}
    response = await client.put(f"/api/v1/societies/{society_id}", json=update_payload, headers=super_admin_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Emerald Gardens"

    # 5. Soft Delete
    response = await client.delete(f"/api/v1/societies/{society_id}", headers=super_admin_headers)
    assert response.status_code == 200
    
    # Verify is inactive/404 on get
    response = await client.get(f"/api/v1/societies/{society_id}", headers=super_admin_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_tenant_isolation_and_rbac(client: AsyncClient, db):
    """
    Enforces RBAC and multi-tenancy:
    - Residents cannot write/update/delete.
    - Admins of Society A cannot read or write Society B's data.
    """
    super_admin_headers, _ = await get_auth_headers(
        client, db, "super@homesync.com", RoleEnum.SUPER_ADMIN.value
    )

    # Create two societies
    soc_a_res = await client.post(
        "/api/v1/societies",
        json={
            "name": "Society A", "region": "North", "city": "Delhi", "state": "Delhi",
            "pincode": "110001", "phone": "9999888877", "email": "a@society.com"
        },
        headers=super_admin_headers
    )
    society_a_id = uuid.UUID(soc_a_res.json()["id"])

    soc_b_res = await client.post(
        "/api/v1/societies",
        json={
            "name": "Society B", "region": "South", "city": "Delhi", "state": "Delhi",
            "pincode": "110002", "phone": "9999888876", "email": "b@society.com"
        },
        headers=super_admin_headers
    )
    society_b_id = uuid.UUID(soc_b_res.json()["id"])

    # Create Admin for Society A, and Resident for Society A
    admin_a_headers, _ = await get_auth_headers(
        client, db, "admin-a@society.com", RoleEnum.SOCIETY_ADMIN.value, society_id=society_a_id
    )
    resident_a_headers, _ = await get_auth_headers(
        client, db, "resident-a@society.com", RoleEnum.RESIDENT.value, society_id=society_a_id
    )

    # 1. RBAC Check: Resident cannot create a wing
    wing_payload = {"name": "Wing 1", "society_id": str(society_a_id)}
    res = await client.post("/api/v1/wings", json=wing_payload, headers=resident_a_headers)
    assert res.status_code == 403

    # 2. Tenant Check: Admin A CAN create wing in Society A
    res = await client.post("/api/v1/wings", json=wing_payload, headers=admin_a_headers)
    assert res.status_code == 201
    wing_a_id = uuid.UUID(res.json()["id"])

    # 3. Tenant Check: Admin A CANNOT create wing in Society B
    wing_b_payload = {"name": "Wing 2", "society_id": str(society_b_id)}
    res = await client.post("/api/v1/wings", json=wing_b_payload, headers=admin_a_headers)
    assert res.status_code == 403

    # 4. Tenant Check: Admin A CANNOT view wings of Society B
    res = await client.get(f"/api/v1/wings?society_id={society_b_id}", headers=admin_a_headers)
    # The list endpoint automatically coerces the filter to their own society_id, so it should only return wings of Society A
    data = res.json()
    for wing in data:
        assert uuid.UUID(wing["society_id"]) == society_a_id

    # 5. Resident CAN view wings of their own society
    res = await client.get(f"/api/v1/wings?society_id={society_a_id}", headers=resident_a_headers)
    assert res.status_code == 200
    assert len(res.json()) > 0


@pytest.mark.asyncio
async def test_society_settings_and_branding(client: AsyncClient, db):
    """
    Test setting updates and society branding uploads/deletes.
    """
    super_headers, _ = await get_auth_headers(
        client, db, "sa@homesync.com", RoleEnum.SUPER_ADMIN.value
    )

    soc_res = await client.post(
        "/api/v1/societies",
        json={
            "name": "Branding Soc", "region": "East", "city": "Kolkata", "state": "West Bengal",
            "pincode": "700001", "phone": "9998887776", "email": "brand@soc.com"
        },
        headers=super_headers
    )
    society_id = uuid.UUID(soc_res.json()["id"])

    # 1. Update settings
    settings_payload = {
        "maintenance_due_day": 10,
        "late_fee_percentage": 15.5,
        "allow_visitor_auto_approve": False,
        "enable_gate_pass": True,
        "visitor_validation_required": True,
        "amenity_booking_advance_days": 45,
        "emergency_contact_number": "9876543212"
    }
    res = await client.put(f"/api/v1/societies/{society_id}/settings", json=settings_payload, headers=super_headers)
    assert res.status_code == 200
    assert res.json()["maintenance_due_day"] == 10
    assert res.json()["late_fee_percentage"] == 15.5

    # 2. Upload Logo (Form multipart upload)
    # Using mock image payload
    files = {"file": ("logo.png", b"fake_png_bytes", "image/png")}
    res = await client.post(f"/api/v1/societies/{society_id}/logo", files=files, headers=super_headers)
    assert res.status_code == 200
    assert "logo_url" in res.json()
    assert res.json()["logo_url"] is not None

    # 3. Upload Banner
    files = {"file": ("banner.jpg", b"fake_jpg_bytes", "image/jpeg")}
    res = await client.post(f"/api/v1/societies/{society_id}/banner", files=files, headers=super_headers)
    assert res.status_code == 200
    assert "banner_url" in res.json()
    assert res.json()["banner_url"] is not None

    # 4. Delete Logo
    res = await client.delete(f"/api/v1/societies/{society_id}/logo", headers=super_headers)
    assert res.status_code == 200
    assert res.json()["logo_url"] is None

    # 5. Delete Banner
    res = await client.delete(f"/api/v1/societies/{society_id}/banner", headers=super_headers)
    assert res.status_code == 200
    assert res.json()["banner_url"] is None


@pytest.mark.asyncio
async def test_property_hierarchy_crud(client: AsyncClient, db):
    """
    Test CRUD for Wing, Floor, and Flat hierarchy.
    """
    super_headers, _ = await get_auth_headers(
        client, db, "admin-hierarchy@homesync.com", RoleEnum.SUPER_ADMIN.value
    )

    # Create Society
    soc_res = await client.post(
        "/api/v1/societies",
        json={
            "name": "Property Soc", "region": "West", "city": "Mumbai", "state": "Maharashtra",
            "pincode": "400001", "phone": "9998887777", "email": "prop@soc.com"
        },
        headers=super_headers
    )
    society_id = uuid.UUID(soc_res.json()["id"])

    # 1. Create Wing
    wing_res = await client.post(
        "/api/v1/wings",
        json={"name": "Block X", "society_id": str(society_id)},
        headers=super_headers
    )
    assert wing_res.status_code == 201
    wing_id = uuid.UUID(wing_res.json()["id"])

    # 2. Create Floor
    floor_res = await client.post(
        "/api/v1/floors",
        json={"floor_number": 4, "wing_id": str(wing_id)},
        headers=super_headers
    )
    assert floor_res.status_code == 201
    floor_id = uuid.UUID(floor_res.json()["id"])

    # 3. Create Flat
    flat_payload = {
        "flat_number": "X-401",
        "flat_type": "3BHK",
        "flat_size": 1850.0,
        "occupancy_status": "OCCUPIED_OWNER",
        "floor_id": str(floor_id),
        "wing_id": str(wing_id),
        "society_id": str(society_id)
    }
    flat_res = await client.post("/api/v1/flats", json=flat_payload, headers=super_headers)
    assert flat_res.status_code == 201
    flat_id = uuid.UUID(flat_res.json()["id"])

    # 4. Flat Validation Errors (Occupancy Status validation)
    bad_flat = dict(flat_payload, occupancy_status="INVALID_STATUS", flat_number="X-402")
    res = await client.post("/api/v1/flats", json=bad_flat, headers=super_headers)
    assert res.status_code == 422

    # 5. Flat size validation (must be > 0)
    bad_size = dict(flat_payload, flat_size=-10.0, flat_number="X-403")
    res = await client.post("/api/v1/flats", json=bad_size, headers=super_headers)
    assert res.status_code == 422

    # 6. Read Flat
    res = await client.get(f"/api/v1/flats/{flat_id}", headers=super_headers)
    assert res.status_code == 200
    assert res.json()["flat_number"] == "X-401"

    # 7. Update Flat
    update_res = await client.put(
        f"/api/v1/flats/{flat_id}", json={"flat_type": "4BHK", "flat_size": 2100.0}, headers=super_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["flat_type"] == "4BHK"

    # 8. Delete Floor and check cascading soft deletes
    # Deleting floor 4 should soft delete flat X-401
    del_floor_res = await client.delete(f"/api/v1/floors/{floor_id}", headers=super_headers)
    assert del_floor_res.status_code == 200

    # Flat X-401 should now return 404
    check_flat_res = await client.get(f"/api/v1/flats/{flat_id}", headers=super_headers)
    assert check_flat_res.status_code == 404


@pytest.mark.asyncio
async def test_flat_import_export(client: AsyncClient, db):
    """
    Test CSV Import and Export.
    """
    super_headers, _ = await get_auth_headers(
        client, db, "admin-import-export@homesync.com", RoleEnum.SUPER_ADMIN.value
    )

    # Create Society
    soc_res = await client.post(
        "/api/v1/societies",
        json={
            "name": "CSV Society", "region": "Central", "city": "Indore", "state": "Madhya Pradesh",
            "pincode": "452001", "phone": "9998885555", "email": "csv@soc.com"
        },
        headers=super_headers
    )
    society_id = uuid.UUID(soc_res.json()["id"])

    # 1. Import CSV
    csv_data = (
        "wing_name,floor_number,flat_number,flat_type,flat_size,occupancy_status\n"
        "Block A,1,A-101,2BHK,1100,VACANT\n"
        "Block A,1,A-102,1BHK,750,OCCUPIED_OWNER\n"
        "Block B,2,B-201,3BHK,1550,OCCUPIED_TENANT\n"
    )
    
    files = {"file": ("flats.csv", csv_data.encode("utf-8"), "text/csv")}
    response = await client.post(f"/api/v1/flats/import?society_id={society_id}", files=files, headers=super_headers)
    assert response.status_code == 200
    assert response.json()["imported_count"] == 3

    # Check that wings and floors were auto-created
    # Fetch wings for society
    wing_res = await client.get(f"/api/v1/wings?society_id={society_id}", headers=super_headers)
    assert len(wing_res.json()) == 2  # Block A and Block B

    # Check flats in society
    flats_res = await client.get(f"/api/v1/flats?society_id={society_id}", headers=super_headers)
    assert len(flats_res.json()) == 3

    # 2. Export CSV
    export_res = await client.get(f"/api/v1/flats/export?society_id={society_id}", headers=super_headers)
    assert export_res.status_code == 200
    export_text = export_res.text
    assert "A-101" in export_text
    assert "B-201" in export_text
    assert "Block A" in export_text

    # 3. Transactional rollback test on bad CSV row
    # Flat A-102 already exists, and third row has a bad occupancy status
    bad_csv_data = (
        "wing_name,floor_number,flat_number,flat_type,flat_size,occupancy_status\n"
        "Block A,1,A-103,2BHK,1100,VACANT\n"
        "Block A,1,A-102,1BHK,750,OCCUPIED_OWNER\n" # CONFLICT
    )
    files = {"file": ("flats_bad.csv", bad_csv_data.encode("utf-8"), "text/csv")}
    response = await client.post(f"/api/v1/flats/import?society_id={society_id}", files=files, headers=super_headers)
    assert response.status_code == 409 # conflict or 400 validation error

    # Verify that flat A-103 was NOT created (due to rollback of the entire batch!)
    flats_res = await client.get(f"/api/v1/flats?society_id={society_id}", headers=super_headers)
    assert len(flats_res.json()) == 3  # still 3, A-103 was not committed!
