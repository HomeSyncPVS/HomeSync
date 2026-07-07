import uuid
import pytest
from httpx import AsyncClient
from app.core.constants import RoleEnum
from tests.test_society_management import get_auth_headers


@pytest.mark.asyncio
async def test_complaint_workflow(client: AsyncClient, db):
    """
    Test complete lifecycle of Complaints: Resident -> Society Admin -> Resolved -> Closed.
    """
    # 1. Login as Super Admin
    admin_headers, admin_user = await get_auth_headers(
        client, db, "admin-complaint-ops@homesync.com", RoleEnum.SUPER_ADMIN.value
    )
    
    # Create a Society for the admin
    soc_res = await client.post(
        "/api/v1/societies",
        json={
            "name": "Complaint Heights", "region": "North", "city": "Delhi", "state": "Delhi",
            "pincode": "110001", "phone": "9812345678", "email": "ops@complaint.com"
        },
        headers=admin_headers
    )
    assert soc_res.status_code == 201
    society_id = uuid.UUID(soc_res.json()["id"])
    
    # Associate Admin with Society
    admin_user.society_id = society_id
    db.add(admin_user)
    await db.commit()

    # 2. Create a Resident
    res_headers, res_user = await get_auth_headers(
        client, db, "resident-complaint-ops@homesync.com", RoleEnum.RESIDENT.value, society_id=society_id
    )

    # 3. Create a Committee Member
    committee_headers, committee_user = await get_auth_headers(
        client, db, "committee-complaint-ops@homesync.com", RoleEnum.COMMITTEE_MEMBER.value, society_id=society_id
    )

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
    assert c_res.json()["status"] == "OPEN"
    assert len(c_res.json()["attachments"]) == 1

    # 5. Committee Member updates status to IN_PROGRESS
    update_payload = {
        "status": "IN_PROGRESS"
    }
    up_res = await client.put(f"/api/v1/complaints/{complaint_id}", json=update_payload, headers=committee_headers)
    assert up_res.status_code == 200
    assert up_res.json()["status"] == "IN_PROGRESS"

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
