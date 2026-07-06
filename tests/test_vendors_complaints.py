import uuid
import pytest
from httpx import AsyncClient
from app.core.constants import RoleEnum
from tests.test_society_management import get_auth_headers


@pytest.mark.asyncio
async def test_vendor_and_complaint_workflow(client: AsyncClient, db):
    """
    Test complete lifecycle of Vendors, Ratings, Complaints, and Assignments.
    """
    # 1. Login as Super Admin
    admin_headers, admin_user = await get_auth_headers(
        client, db, "admin-ops@homesync.com", RoleEnum.SUPER_ADMIN.value
    )
    
    # Create a Society for the admin
    soc_res = await client.post(
        "/api/v1/societies",
        json={
            "name": "Ops Heights", "region": "North", "city": "Delhi", "state": "Delhi",
            "pincode": "110001", "phone": "9812345678", "email": "ops@heights.com"
        },
        headers=admin_headers
    )
    assert soc_res.status_code == 201
    society_id = uuid.UUID(soc_res.json()["id"])
    
    # Associate Admin with Society
    admin_user.society_id = society_id
    db.add(admin_user)
    await db.commit()

    # 2. Register a Vendor (requires society:manage, which Admin has)
    vendor_payload = {
        "name": "Delhi Plumbers Ltd",
        "phone": "9876543219",
        "email": "plumber@delhi.com",
        "category": "Plumbing",
        "experience": 5,
        "status": "ACTIVE",
        "society_id": str(society_id)
    }
    v_res = await client.post("/api/v1/vendors/", json=vendor_payload, headers=admin_headers)
    assert v_res.status_code == 201
    vendor_id = uuid.UUID(v_res.json()["id"])
    assert v_res.json()["name"] == "Delhi Plumbers Ltd"

    # 3. Create a Resident and rate the Vendor
    res_headers, res_user = await get_auth_headers(
        client, db, "resident-ops@homesync.com", RoleEnum.RESIDENT.value, society_id=society_id
    )
    
    rating_payload = {
        "rating": 5,
        "feedback": "Prompt and clean job!"
    }
    r_res = await client.post(f"/api/v1/vendors/{vendor_id}/ratings", json=rating_payload, headers=res_headers)
    assert r_res.status_code == 201
    assert r_res.json()["rating"] == 5

    # Check vendor avg rating updated
    v_details = await client.get(f"/api/v1/vendors/{vendor_id}", headers=res_headers)
    assert v_details.status_code == 200
    assert v_details.json()["rating"] == 5.0

    # 4. Resident raises a Complaint
    complaint_payload = {
        "title": "Water leakage in kitchen",
        "description": "Pipe under the kitchen sink is leaking heavily.",
        "category": "Plumbing",
        "priority": "HIGH",
        "location": "Flat 302, Wing A",
        "society_id": str(society_id),
        "attachment_urls": ["http://storage.com/leak.jpg"]
    }
    c_res = await client.post("/api/v1/complaints/", json=complaint_payload, headers=res_headers)
    assert c_res.status_code == 201
    complaint_id = uuid.UUID(c_res.json()["id"])
    assert c_res.json()["status"] == "RAISED"
    assert len(c_res.json()["attachments"]) == 1

    # 5. Admin updates/assigns Vendor to the Complaint
    assign_payload = {
        "vendor_id": str(vendor_id),
        "status": "ASSIGNED"
    }
    up_res = await client.put(f"/api/v1/complaints/{complaint_id}", json=assign_payload, headers=admin_headers)
    assert up_res.status_code == 200
    assert up_res.json()["status"] == "ASSIGNED"
    assert uuid.UUID(up_res.json()["vendor_id"]) == vendor_id

    # 6. Admin resolves the complaint
    resolve_payload = {
        "status": "RESOLVED"
    }
    res_up_res = await client.put(f"/api/v1/complaints/{complaint_id}", json=resolve_payload, headers=admin_headers)
    assert res_up_res.status_code == 200
    assert res_up_res.json()["status"] == "RESOLVED"
    assert res_up_res.json()["resolved_at"] is not None

    # 7. Resident closes the complaint
    close_res = await client.post(f"/api/v1/complaints/{complaint_id}/close", headers=res_headers)
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"
