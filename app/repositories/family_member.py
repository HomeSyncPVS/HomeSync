from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.family_member import FamilyMember


class FamilyMemberRepository(BaseRepository[FamilyMember]):
    def __init__(self):
        super().__init__(FamilyMember)

    async def get_by_user(self, db: AsyncSession, user_id: str) -> List[FamilyMember]:
        """
        Fetch all family members of a user.
        """
        query = select(FamilyMember).where(FamilyMember.user_id == user_id)
        result = await db.execute(query)
        return list(result.scalars().all())
