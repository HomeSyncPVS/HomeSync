import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.constants import RoleEnum
from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User


async def get_auth_headers(client: AsyncClient, db, email: str, role_name: str, society_id=None):
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
    )
    db.add(user)
    await db.commit()

    payload = {
        "email": email,
        "password": "PasswordMatch!123",
        "device_type": "web",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_billing_payment_reports_analytics_flow(client: AsyncClient, db):
    super_headers = await get_auth_headers(
        client, db, "billing-super@homesync.com", RoleEnum.SUPER_ADMIN.value
    )

    society_res = await client.post(
        "/api/v1/societies",
        json={
            "name": "Billing Society",
            "region": "Central",
            "city": "Pune",
            "state": "Maharashtra",
            "pincode": "411001",
            "phone": "9998887771",
            "email": "billing@society.com",
        },
        headers=super_headers,
    )
    assert society_res.status_code == 201, society_res.text
    society_id = society_res.json()["id"]

    wing_res = await client.post(
        "/api/v1/wings",
        json={"name": "A", "society_id": society_id},
        headers=super_headers,
    )
    assert wing_res.status_code == 201, wing_res.text
    wing_id = wing_res.json()["id"]

    floor_res = await client.post(
        "/api/v1/floors",
        json={"wing_id": wing_id, "floor_number": 1},
        headers=super_headers,
    )
    assert floor_res.status_code == 201, floor_res.text
    floor_id = floor_res.json()["id"]

    flat_res = await client.post(
        "/api/v1/flats",
        json={
            "floor_id": floor_id,
            "wing_id": wing_id,
            "society_id": society_id,
            "flat_number": "A-101",
            "flat_type": "2BHK",
            "flat_size": 1100.0,
            "occupancy_status": "VACANT",
        },
        headers=super_headers,
    )
    assert flat_res.status_code == 201, flat_res.text
    flat_id = flat_res.json()["id"]

    bill_res = await client.post(
        "/api/v1/bills",
        json={
            "flat_id": flat_id,
            "bill_type": "MONTHLY",
            "billing_period_start": "2026-07-01",
            "billing_period_end": "2026-07-31",
            "due_date": "2026-07-10T12:00:00Z",
            "items": [
                {
                    "name": "Maintenance",
                    "amount": 2500.0,
                },
                {
                    "name": "Water",
                    "amount": 500.0,
                },
            ],
        },
        headers=super_headers,
    )
    assert bill_res.status_code == 201, bill_res.text
    bill_id = bill_res.json()["id"]

    send_res = await client.post(f"/api/v1/bills/{bill_id}/send", headers=super_headers)
    assert send_res.status_code == 200, send_res.text

    create_order_res = await client.post(
        "/api/v1/payments/create-order",
        json={
            "bill_id": str(bill_id),
            "payment_method": "UPI",
        },
        headers=super_headers,
    )
    assert create_order_res.status_code == 200, create_order_res.text
    order_id = create_order_res.json()["order_id"]

    verify_res = await client.post(
        "/api/v1/payments/verify",
        json={
            "order_id": order_id,
            "transaction_reference": f"TXN-{uuid.uuid4().hex[:8]}",
            "payment_method": "UPI",
        },
        headers=super_headers,
    )
    assert verify_res.status_code == 200, verify_res.text
    assert verify_res.json()["status"] == "COMPLETED"

    bill_get_res = await client.get(f"/api/v1/bills/{bill_id}", headers=super_headers)
    assert bill_get_res.status_code == 200
    assert bill_get_res.json()["status"] == "PAID"

    billing_report_res = await client.get(
        f"/api/v1/reports/billing?society_id={society_id}",
        headers=super_headers,
    )
    assert billing_report_res.status_code == 200, billing_report_res.text
    assert sum(b["total_amount"] for b in billing_report_res.json()) >= 3000.0

    payments_report_res = await client.get(
        f"/api/v1/reports/payments?society_id={society_id}",
        headers=super_headers,
    )
    assert payments_report_res.status_code == 200, payments_report_res.text
    assert len(payments_report_res.json()) >= 1

    revenue_report_res = await client.get(
        f"/api/v1/reports/revenue?society_id={society_id}",
        headers=super_headers,
    )
    assert revenue_report_res.status_code == 200, revenue_report_res.text

    outstanding_report_res = await client.get(
        f"/api/v1/reports/outstanding?society_id={society_id}",
        headers=super_headers,
    )
    assert outstanding_report_res.status_code == 200, outstanding_report_res.text

    csv_export_res = await client.get(
        f"/api/v1/reports/export/csv?society_id={society_id}",
        headers=super_headers,
    )
    assert csv_export_res.status_code == 200
    assert "text/csv" in csv_export_res.headers.get("content-type", "")

    dashboard_res = await client.get(
        f"/api/v1/analytics/dashboard?society_id={society_id}",
        headers=super_headers,
    )
    assert dashboard_res.status_code == 200, dashboard_res.text
    assert dashboard_res.json()["total_bills_generated"] >= 1

    outstanding_res = await client.get(
        f"/api/v1/analytics/outstanding?society_id={society_id}",
        headers=super_headers,
    )
    assert outstanding_res.status_code == 200
    assert outstanding_res.json()["outstanding_amount"] == 0.0
