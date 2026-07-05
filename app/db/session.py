from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency generator for SQLAlchemy AsyncSession.
    Ensures rollback on error, commit on success, and close on termination.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
            
            
async def get_db_no_commit() -> AsyncGenerator[AsyncSession, None]:
    """
    Alternative session dependency for workflows where we want manual transaction control.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
