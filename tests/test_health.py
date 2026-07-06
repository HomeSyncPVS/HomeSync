import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check_endpoint(client: AsyncClient):
    """
    Test the health check endpoint returns correct database and system status.
    """
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "timestamp" in data
    assert "database" in data
    assert "redis" in data
    assert "environment" in data
    
    # Assert database is active and connected
    assert data["database"]["status"] == "connected"
    assert data["database"]["latency_ms"] is not None
