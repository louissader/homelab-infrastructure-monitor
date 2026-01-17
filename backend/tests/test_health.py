"""
Tests for health check endpoints.
These tests run against the live server - ensure backend is running on localhost:8000.
"""

import pytest
import httpx


@pytest.mark.asyncio
async def test_health_check():
    """Test health check endpoint returns healthy status."""
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "environment" in data


@pytest.mark.asyncio
async def test_root_endpoint():
    """Test root endpoint returns API info."""
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        response = await client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "HomeLab" in data["message"]
        assert "version" in data
        assert "docs" in data


@pytest.mark.asyncio
async def test_docs_endpoint():
    """Test OpenAPI docs are accessible."""
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        response = await client.get("/docs")

        # Docs endpoint returns HTML
        assert response.status_code == 200


@pytest.mark.asyncio
async def test_openapi_schema():
    """Test OpenAPI schema is accessible."""
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        response = await client.get("/openapi.json")

        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "paths" in data
        assert "info" in data
