from datetime import datetime, timezone
from typing import List, Optional, Any
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.session import Session


class SessionRepository(BaseRepository[Session]):
    def __init__(self):
        super().__init__(Session)

    async def get_by_token_hash(self, db: AsyncSession, token_hash: str) -> Optional[Session]:
        """
        Retrieve an active session by its refresh token hash.
        """
        query = select(Session).where(
            Session.refresh_token_hash == token_hash,
            Session.is_active == True,
            Session.expires_at > datetime.now(timezone.utc),
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_active_sessions_by_user_id(self, db: AsyncSession, user_id: Any) -> List[Session]:
        """
        Get all active sessions for a user, ordered by creation time ascending (oldest first).
        """
        query = (
            select(Session)
            .where(
                Session.user_id == user_id,
                Session.is_active == True,
                Session.expires_at > datetime.now(timezone.utc),
            )
            .order_by(Session.created_at.asc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def revoke_session(self, db: AsyncSession, session_id: Any) -> Optional[Session]:
        """
        Deactivate a single session by setting is_active = False.
        """
        session = await self.get(db, session_id)
        if session:
            session.is_active = False
            db.add(session)
            await db.flush()
        return session

    async def revoke_all_user_sessions(self, db: AsyncSession, user_id: Any, except_session_id: Optional[Any] = None) -> None:
        """
        Revoke all active sessions for a user, optionally keeping one active.
        """
        statement = (
            update(Session)
            .where(Session.user_id == user_id, Session.is_active == True)
            .values(is_active=False)
        )
        if except_session_id:
            statement = statement.where(Session.id != except_session_id)
            
        await db.execute(statement)
        await db.flush()
