import asyncio
from typing import AsyncGenerator
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import settings
from app.core.constants import RoleEnum, PermissionEnum
from app.db.session import get_db
from app.models.role import Role
from app.models.permission import Permission
from app.main import app

from sqlalchemy import pool

# Create test engine pointing to the same homesync schema
engine = create_async_engine(
    settings.DATABASE_URL,
    poolclass=pool.NullPool,
    connect_args={"server_settings": {"search_path": "homesync"}},
)
TestingSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

from sqlalchemy.orm import selectinload

async def seed_test_db(db: AsyncSession):
    """
    Seeds database roles and permissions for tests inside the active transaction.
    """
    db_perms = {}
    for p in PermissionEnum:
        perm_name = p.value
        result = await db.execute(select(Permission).where(Permission.name == perm_name))
        perm = result.scalar_one_or_none()
        if not perm:
            perm = Permission(name=perm_name, description=f"Test permission for {perm_name}")
            db.add(perm)
            await db.flush()
        db_perms[perm_name] = perm

    # Resident Role
    result = await db.execute(
        select(Role)
        .where(Role.name == RoleEnum.RESIDENT.value)
        .options(selectinload(Role.permissions))
    )
    resident_role = result.scalar_one_or_none()
    if not resident_role:
        resident_role = Role(
            name=RoleEnum.RESIDENT.value,
            description="Resident Role",
            permissions=[db_perms[PermissionEnum.RESIDENT_ACCESS.value]],
        )
        db.add(resident_role)
    else:
        resident_role.permissions = [db_perms[PermissionEnum.RESIDENT_ACCESS.value]]

    # Admin Role
    result = await db.execute(
        select(Role)
        .where(Role.name == RoleEnum.ADMIN.value)
        .options(selectinload(Role.permissions))
    )
    admin_role = result.scalar_one_or_none()
    if not admin_role:
        admin_role = Role(
            name=RoleEnum.ADMIN.value,
            description="Admin Role",
            permissions=[
                db_perms[PermissionEnum.VIEW_USERS.value],
                db_perms[PermissionEnum.RESIDENT_ACCESS.value],
                db_perms[PermissionEnum.MANAGE_DEVICES.value],
                db_perms[PermissionEnum.VIEW_SOCIETY.value],
            ],
        )
        db.add(admin_role)
    else:
        admin_role.permissions = [
            db_perms[PermissionEnum.VIEW_USERS.value],
            db_perms[PermissionEnum.RESIDENT_ACCESS.value],
            db_perms[PermissionEnum.MANAGE_DEVICES.value],
            db_perms[PermissionEnum.VIEW_SOCIETY.value],
        ]

    # Super Admin Role
    result = await db.execute(
        select(Role)
        .where(Role.name == RoleEnum.SUPER_ADMIN.value)
        .options(selectinload(Role.permissions))
    )
    super_admin_role = result.scalar_one_or_none()
    if not super_admin_role:
        super_admin_role = Role(
            name=RoleEnum.SUPER_ADMIN.value,
            description="Super Admin Role",
            permissions=list(db_perms.values()),
        )
        db.add(super_admin_role)
    else:
        super_admin_role.permissions = list(db_perms.values())

    await db.commit()


from sqlalchemy import delete
from app.models.user import User
from app.models.otp import OtpCode
from app.models.session import Session
from app.models.device import Device
from app.models.email_verification import EmailVerification
from app.models.password_reset import PasswordReset


async def clean_test_db(db: AsyncSession):
    """
    Cleans up the database tables sequentially to prevent foreign key errors.
    """
    await db.execute(delete(Session))
    await db.execute(delete(Device))
    await db.execute(delete(EmailVerification))
    await db.execute(delete(PasswordReset))
    await db.execute(delete(OtpCode))
    await db.execute(delete(User))
    await db.commit()


@pytest.fixture(scope="function", autouse=True)
async def db() -> AsyncGenerator[AsyncSession, None]:
    """
    Test DB session fixture for assertions.
    """
    async with TestingSessionLocal() as session:
        # Seed default data
        await seed_test_db(session)
        # Clean existing test records
        await clean_test_db(session)
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    HTTP client fixture for testing endpoints.
    """
    async def _override_get_db():
        async with TestingSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = _override_get_db
    
    from httpx import ASGITransport
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
        
    app.dependency_overrides.clear()
