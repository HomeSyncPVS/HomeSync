import asyncio
from typing import AsyncGenerator
from unittest.mock import patch
# Mock SMTP globally for tests
patch("app.utils.email.send_email").start()

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import settings
settings.SUPABASE_URL = "https://mock.supabase.co"
from app.core.constants import RoleEnum, PermissionEnum
from app.db.session import get_db
from app.db.base import Base
from app.models.role import Role
from app.models.permission import Permission
from app.main import app

from sqlalchemy import pool

from app.db.database import resolved_url, connect_args

# Create test engine pointing to the same homesync schema with resolved URL and SSL context
test_connect_args = connect_args.copy()
test_connect_args["server_settings"] = {"search_path": "homesync"}

engine = create_async_engine(
    resolved_url,
    poolclass=pool.NullPool,
    connect_args=test_connect_args,
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

    # Committee Member Role
    result = await db.execute(
        select(Role)
        .where(Role.name == RoleEnum.COMMITTEE_MEMBER.value)
        .options(selectinload(Role.permissions))
    )
    committee_role = result.scalar_one_or_none()
    if not committee_role:
        committee_role = Role(
            name=RoleEnum.COMMITTEE_MEMBER.value,
            description="Committee Member Role",
            permissions=[
                db_perms[PermissionEnum.RESIDENT_ACCESS.value],
                db_perms[PermissionEnum.VIEW_SOCIETY.value],
                db_perms[PermissionEnum.MANAGE_SOCIETY.value],
            ],
        )
        db.add(committee_role)
    else:
        committee_role.permissions = [
            db_perms[PermissionEnum.RESIDENT_ACCESS.value],
            db_perms[PermissionEnum.VIEW_SOCIETY.value],
            db_perms[PermissionEnum.MANAGE_SOCIETY.value],
        ]

    # Society Admin Role
    result = await db.execute(
        select(Role)
        .where(Role.name == RoleEnum.SOCIETY_ADMIN.value)
        .options(selectinload(Role.permissions))
    )
    admin_role = result.scalar_one_or_none()
    if not admin_role:
        admin_role = Role(
            name=RoleEnum.SOCIETY_ADMIN.value,
            description="Society Admin Role",
            permissions=[
                db_perms[PermissionEnum.VIEW_USERS.value],
                db_perms[PermissionEnum.RESIDENT_ACCESS.value],
                db_perms[PermissionEnum.MANAGE_DEVICES.value],
                db_perms[PermissionEnum.VIEW_SOCIETY.value],
                db_perms[PermissionEnum.MANAGE_SOCIETY.value],
            ],
        )
        db.add(admin_role)
    else:
        admin_role.permissions = [
            db_perms[PermissionEnum.VIEW_USERS.value],
            db_perms[PermissionEnum.RESIDENT_ACCESS.value],
            db_perms[PermissionEnum.MANAGE_DEVICES.value],
            db_perms[PermissionEnum.VIEW_SOCIETY.value],
            db_perms[PermissionEnum.MANAGE_SOCIETY.value],
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


from sqlalchemy import delete, text
from app.models.user import User
from app.models.otp import OtpCode
from app.models.session import Session
from app.models.device import Device
from app.models.password_reset import PasswordReset
from app.models.flat import Flat
from app.models.floor import Floor
from app.models.wing import Wing
from app.models.society import Society, SocietySettings
from app.models.bill import MaintenanceBill, BillItem
from app.models.payment import Payment, PaymentReceipt


async def clean_test_db(db: AsyncSession):
    """
    Cleans up the database tables sequentially to prevent foreign key errors.
    """
    async def _table_exists(table_name: str) -> bool:
        result = await db.execute(text("SELECT to_regclass(:name)"), {"name": table_name})
        return result.scalar_one_or_none() is not None

    if await _table_exists("payment_receipts"):
        await db.execute(delete(PaymentReceipt))
    if await _table_exists("payments"):
        await db.execute(delete(Payment))
    if await _table_exists("bill_items"):
        await db.execute(delete(BillItem))
    if await _table_exists("maintenance_bills"):
        await db.execute(delete(MaintenanceBill))
    await db.execute(delete(Flat))
    await db.execute(delete(Floor))
    await db.execute(delete(Wing))
    await db.execute(delete(SocietySettings))
    await db.execute(delete(Session))
    await db.execute(delete(Device))
    await db.execute(delete(PasswordReset))
    await db.execute(delete(OtpCode))
    await db.execute(delete(Society))
    await db.execute(delete(User))
    await db.commit()



_db_initialized = False


@pytest.fixture(scope="function", autouse=True)
async def db() -> AsyncGenerator[AsyncSession, None]:
    """
    Test DB session fixture for assertions.
    """
    global _db_initialized
    if not _db_initialized:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        _db_initialized = True

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
