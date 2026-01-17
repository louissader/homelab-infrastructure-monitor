"""
Pytest fixtures for testing.
"""

import pytest
import asyncio
from typing import AsyncGenerator, Generator
from uuid import uuid4

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import get_db
from app.models.models import Base, Host, ApiKey, HostStatus
from app.core.auth import hash_api_key


# Test database URL (in-memory SQLite for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_engine():
    """Create async test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def test_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create async test database session."""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session


@pytest.fixture(scope="function")
async def client(test_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client with database override."""

    async def override_get_db():
        yield test_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def test_host(test_session: AsyncSession) -> Host:
    """Create a test host."""
    plain_key = f"hlm_{uuid4().hex}"
    key_hash = hash_api_key(plain_key)

    host = Host(
        id=uuid4(),
        name="test-host",
        hostname="test-host.local",
        api_key_hash=key_hash,
        status=HostStatus.HEALTHY,
    )
    test_session.add(host)
    await test_session.commit()
    await test_session.refresh(host)
    return host


@pytest.fixture
async def test_api_key(test_session: AsyncSession, test_host: Host) -> tuple[str, ApiKey]:
    """Create a test API key and return (plain_key, api_key_object)."""
    plain_key = f"hlm_{uuid4().hex}"
    key_hash = hash_api_key(plain_key)

    api_key = ApiKey(
        id=uuid4(),
        name="Test API Key",
        host_id=test_host.id,
        key_hash=key_hash,
        key_type="agent",
        revoked="false",
    )
    test_session.add(api_key)
    await test_session.commit()
    await test_session.refresh(api_key)

    return plain_key, api_key


@pytest.fixture
def auth_headers(test_api_key: tuple[str, ApiKey]) -> dict:
    """Create authentication headers with test API key."""
    plain_key, _ = test_api_key
    return {"Authorization": f"Bearer {plain_key}"}
