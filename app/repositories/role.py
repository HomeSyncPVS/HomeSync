from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.role import Role
from app.models.permission import Permission


class RoleRepository(BaseRepository[Role]):
    def __init__(self):
        super().__init__(Role)

    async def get_by_name(self, db: AsyncSession, name: str) -> Optional[Role]:
        """
        Fetch a role by name.
        """
        query = select(Role).where(Role.name == name)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_permission_by_name(self, db: AsyncSession, name: str) -> Optional[Permission]:
        """
        Fetch a permission by name.
        """
        query = select(Permission).where(Permission.name == name)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_permission(
        self, db: AsyncSession, name: str, description: Optional[str] = None
    ) -> Permission:
        """
        Create a new permission if it doesn't exist.
        """
        permission = await self.get_permission_by_name(db, name)
        if not permission:
            permission = Permission(name=name, description=description)
            db.add(permission)
            await db.flush()
        return permission
