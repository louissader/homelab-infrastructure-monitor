"""
Tests for hosts API endpoints.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Host


@pytest.mark.asyncio
async def test_list_hosts_empty(client: AsyncClient):
    """Test listing hosts when database is empty."""
    response = await client.get("/api/v1/hosts")

    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.asyncio
async def test_list_hosts_with_data(client: AsyncClient, test_host: Host):
    """Test listing hosts returns existing hosts."""
    response = await client.get("/api/v1/hosts")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "test-host"
    assert data[0]["hostname"] == "test-host.local"


@pytest.mark.asyncio
async def test_create_host(client: AsyncClient):
    """Test creating a new host."""
    host_data = {
        "name": "new-host",
        "hostname": "new-host.local",
        "ip_address": "192.168.1.101",
    }

    response = await client.post("/api/v1/hosts", json=host_data)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "new-host"
    assert data["hostname"] == "new-host.local"
    assert "api_key" in data  # New hosts get an API key
    assert "id" in data


@pytest.mark.asyncio
async def test_create_host_duplicate_name(client: AsyncClient, test_host: Host):
    """Test creating a host with duplicate name fails."""
    host_data = {
        "name": "test-host",  # Same name as test_host
        "hostname": "another-host.local",
    }

    response = await client.post("/api/v1/hosts", json=host_data)

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_host_by_id(client: AsyncClient, test_host: Host):
    """Test getting a specific host by ID."""
    response = await client.get(f"/api/v1/hosts/{test_host.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_host.id)
    assert data["name"] == "test-host"


@pytest.mark.asyncio
async def test_get_host_not_found(client: AsyncClient):
    """Test getting a non-existent host returns 404."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/api/v1/hosts/{fake_id}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_host(client: AsyncClient, test_host: Host):
    """Test updating a host."""
    update_data = {
        "hostname": "updated-host.local",
        "status": "warning",
    }

    response = await client.put(f"/api/v1/hosts/{test_host.id}", json=update_data)

    assert response.status_code == 200
    data = response.json()
    assert data["hostname"] == "updated-host.local"
    assert data["status"] == "warning"


@pytest.mark.asyncio
async def test_delete_host(client: AsyncClient, test_host: Host):
    """Test deleting a host."""
    response = await client.delete(f"/api/v1/hosts/{test_host.id}")

    assert response.status_code == 204

    # Verify host is deleted
    get_response = await client.get(f"/api/v1/hosts/{test_host.id}")
    assert get_response.status_code == 404
