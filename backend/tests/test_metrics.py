"""
Tests for metrics API endpoints.
"""

import pytest
from datetime import datetime
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Host, APIKey


@pytest.mark.asyncio
async def test_query_metrics_empty(client: AsyncClient):
    """Test querying metrics when none exist."""
    response = await client.get("/api/v1/metrics")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_ingest_metrics_without_auth(client: AsyncClient):
    """Test metrics ingestion requires authentication."""
    payload = {
        "timestamp": datetime.utcnow().isoformat(),
        "metrics": {
            "cpu": {"percent": 50.0},
        },
    }

    response = await client.post("/api/v1/metrics", json=payload)

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_ingest_metrics_with_auth(
    client: AsyncClient,
    test_host: Host,
    test_api_key: tuple[str, APIKey],
):
    """Test successful metrics ingestion with valid API key."""
    plain_key, _ = test_api_key
    headers = {"Authorization": f"Bearer {plain_key}"}

    payload = {
        "timestamp": datetime.utcnow().isoformat(),
        "metrics": {
            "cpu": {
                "percent": 45.5,
                "per_cpu": [40.0, 50.0, 45.0, 47.0],
                "load_avg": {"1min": 1.5, "5min": 1.2, "15min": 1.0},
            },
            "memory": {
                "total": 16000000000,
                "available": 8000000000,
                "used": 8000000000,
                "percent": 50.0,
            },
        },
    }

    response = await client.post("/api/v1/metrics", json=payload, headers=headers)

    assert response.status_code == 201
    data = response.json()
    assert "message" in data
    assert data["host_id"] == str(test_host.id)


@pytest.mark.asyncio
async def test_get_latest_metrics(client: AsyncClient, test_host: Host):
    """Test getting latest metrics for all hosts."""
    response = await client.get("/api/v1/metrics/latest")

    assert response.status_code == 200
    # Should return empty list or list with host info
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_query_metrics_with_filter(
    client: AsyncClient,
    test_host: Host,
):
    """Test querying metrics with host filter."""
    response = await client.get(f"/api/v1/metrics?host_id={test_host.id}")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_query_metrics_with_type_filter(client: AsyncClient):
    """Test querying metrics with metric type filter."""
    response = await client.get("/api/v1/metrics?metric_type=cpu")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_cleanup_metrics(client: AsyncClient):
    """Test metrics cleanup endpoint."""
    response = await client.delete("/api/v1/metrics/cleanup?days=30")

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "cutoff_date" in data
