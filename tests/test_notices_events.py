import uuid
import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from app.core.constants import RoleEnum
from tests.test_society_management import get_auth_headers


@pytest.mark.asyncio
async def test_notice_and_event_workflows(client: AsyncClient, db):
    """
    Test society notices, active/archived list, events, and RSVPs.
    """
    # 1. Login as Super Admin
    admin_headers, admin_user = await get_auth_headers(
        client, db, "admin-notice-event@homesync.com", RoleEnum.SUPER_ADMIN.value
    )
    
    # Create Society
    soc_res = await client.post(
        "/api/v1/societies",
        json={
            "name": "Notice Event Heights", "region": "West", "city": "Mumbai", "state": "Maharashtra",
            "pincode": "400706", "phone": "9988776655", "email": "info@neheights.com"
        },
        headers=admin_headers
    )
    assert soc_res.status_code == 201
    society_id = uuid.UUID(soc_res.json()["id"])
    
    # Associate Admin with Society
    admin_user.society_id = society_id
    db.add(admin_user)
    await db.commit()

    # 2. Publish a Notice
    notice_payload = {
        "title": "Annual General Meeting 2026",
        "content": "All residents are requested to attend the AGM this Sunday in the clubhouse.",
        "notice_type": "General",
        "target_group": "All",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "society_id": str(society_id)
    }
    n_res = await client.post("/api/v1/notices/", json=notice_payload, headers=admin_headers)
    assert n_res.status_code == 201
    assert n_res.json()["title"] == "Annual General Meeting 2026"
    notice_id = uuid.UUID(n_res.json()["id"])

    # 3. Create a Resident and get active notices
    res_headers, res_user = await get_auth_headers(
        client, db, "resident-ne@homesync.com", RoleEnum.RESIDENT.value, society_id=society_id
    )
    
    active_notices_res = await client.get(f"/api/v1/notices/?society_id={society_id}", headers=res_headers)
    assert active_notices_res.status_code == 200
    assert len(active_notices_res.json()) == 1

    # 4. Create an Event (requires society:manage, Admin has it)
    event_time = datetime.now(timezone.utc) + timedelta(days=5)
    rsvp_deadline = datetime.now(timezone.utc) + timedelta(days=3)
    event_payload = {
        "name": "Independence Day Celebration",
        "description": "Flag hoisting followed by cultural programs and high tea.",
        "date_time": event_time.isoformat(),
        "duration_minutes": 120,
        "location": "Central Lawn",
        "rsvp_deadline": rsvp_deadline.isoformat(),
        "capacity": 2,  # set low to verify capacity check
        "entry_fee": 100.0,
        "society_id": str(society_id)
    }
    e_res = await client.post("/api/v1/events/", json=event_payload, headers=admin_headers)
    assert e_res.status_code == 201
    event_id = uuid.UUID(e_res.json()["id"])
    assert e_res.json()["name"] == "Independence Day Celebration"

    # 5. Resident RSVPs to the Event
    rsvp_payload = {
        "status": "Attending",
        "additional_guests": 1  # Total 2 spots occupied (User + 1 guest)
    }
    rsvp_res = await client.post(f"/api/v1/events/{event_id}/rsvp", json=rsvp_payload, headers=res_headers)
    assert rsvp_res.status_code == 200
    assert rsvp_res.json()["status"] == "Attending"

    # 6. Try to RSVP from another resident to trigger capacity validation
    res2_headers, res2_user = await get_auth_headers(
        client, db, "resident2-ne@homesync.com", RoleEnum.RESIDENT.value, society_id=society_id
    )
    # This should fail because remaining capacity is 0 (capacity is 2, first resident occupied 2 spots)
    failed_rsvp_res = await client.post(f"/api/v1/events/{event_id}/rsvp", json={"status": "Attending", "additional_guests": 0}, headers=res2_headers)
    assert failed_rsvp_res.status_code == 400
    assert failed_rsvp_res.json()["error_code"] == "EVENT_AT_CAPACITY"
