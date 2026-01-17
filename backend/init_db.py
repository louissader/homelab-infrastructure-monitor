"""
Initialize database tables.
Run this script to create all tables before starting the backend.
"""

import asyncio
import sys
sys.path.insert(0, '.')

from app.db.base import engine, Base
from app.models.models import Host, Metric, Alert, AlertRule, ApiKey


async def init_db():
    """Create all database tables."""
    print("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully!")


async def drop_db():
    """Drop all database tables."""
    print("Dropping database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("Database tables dropped!")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--drop":
        asyncio.run(drop_db())
    asyncio.run(init_db())
