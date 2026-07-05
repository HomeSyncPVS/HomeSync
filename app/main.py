import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request, status, Response
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.constants import RoleEnum, PermissionEnum
from app.db.database import AsyncSessionLocal
from app.db.base import Base
from app.models.role import Role
from app.models.permission import Permission
from app.api.v1.api import api_router
from app.middleware.security import SecurityHeadersMiddleware
from app.middleware.logging import LoggingMiddleware
from app.exceptions.custom import BaseAppException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("homesync.main")


async def seed_database():
    """
    Seeds permissions and roles on application startup.
    """
    logger.info("Checking & seeding default roles and permissions...")
    async with AsyncSessionLocal() as db:
        try:
            # 1. Create permissions
            db_perms = {}
            for p in PermissionEnum:
                perm_name = p.value
                query = select(Permission).where(Permission.name == perm_name)
                result = await db.execute(query)
                perm = result.scalar_one_or_none()
                
                if not perm:
                    perm = Permission(
                        name=perm_name,
                        description=f"Permission for {perm_name.replace(':', ' ')}",
                    )
                    db.add(perm)
                    await db.flush()
                    
                db_perms[perm_name] = perm

            # 2. Seed Resident role
            query = select(Role).where(Role.name == RoleEnum.RESIDENT.value).options(selectinload(Role.permissions))
            result = await db.execute(query)
            resident_role = result.scalar_one_or_none()
            if not resident_role:
                resident_role = Role(
                    name=RoleEnum.RESIDENT.value,
                    description="Resident of a property in the system.",
                    permissions=[db_perms[PermissionEnum.RESIDENT_ACCESS.value]],
                )
                db.add(resident_role)
            else:
                resident_role.permissions = [db_perms[PermissionEnum.RESIDENT_ACCESS.value]]

            # 3. Seed Staff role
            query = select(Role).where(Role.name == RoleEnum.STAFF.value).options(selectinload(Role.permissions))
            result = await db.execute(query)
            staff_role = result.scalar_one_or_none()
            if not staff_role:
                staff_role = Role(
                    name=RoleEnum.STAFF.value,
                    description="Staff or utility employee.",
                    permissions=[
                        db_perms[PermissionEnum.RESIDENT_ACCESS.value],
                        db_perms[PermissionEnum.MANAGE_DEVICES.value],
                    ],
                )
                db.add(staff_role)
            else:
                staff_role.permissions = [
                    db_perms[PermissionEnum.RESIDENT_ACCESS.value],
                    db_perms[PermissionEnum.MANAGE_DEVICES.value],
                ]

            # 4. Seed Admin role
            query = select(Role).where(Role.name == RoleEnum.ADMIN.value).options(selectinload(Role.permissions))
            result = await db.execute(query)
            admin_role = result.scalar_one_or_none()
            if not admin_role:
                admin_role = Role(
                    name=RoleEnum.ADMIN.value,
                    description="Property group administrator.",
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

            # 5. Seed Super Admin role
            query = select(Role).where(Role.name == RoleEnum.SUPER_ADMIN.value).options(selectinload(Role.permissions))
            result = await db.execute(query)
            super_admin_role = result.scalar_one_or_none()
            if not super_admin_role:
                super_admin_role = Role(
                    name=RoleEnum.SUPER_ADMIN.value,
                    description="System super administrator with full access.",
                    permissions=list(db_perms.values()),
                )
                db.add(super_admin_role)
            else:
                super_admin_role.permissions = list(db_perms.values())

            await db.commit()
            logger.info("Database roles and permissions seeding completed.")
        except Exception as e:
            await db.rollback()
            logger.error(f"Error seeding database: {str(e)}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan manager handles startup and shutdown logic.
    """
    import sys
    # Seeding database on startup (skip if running tests to avoid greenlet context issues)
    if "pytest" not in sys.modules:
        await seed_database()
    yield
    # Shutdown logic if any goes here


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-grade SaaS Authentication and Identity Management API for HomeSync.",
    version="1.0.0",
    lifespan=lifespan,
)

# Apply CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)

# Wire up routers
app.include_router(api_router, prefix=settings.API_V1_STR)


# ==========================================
# EXCEPTION HANDLERS
# ==========================================

@app.exception_handler(BaseAppException)
async def custom_app_exception_handler(request: Request, exc: BaseAppException):
    """
    Catch custom exceptions and return unified ErrorResponse layout.
    """
    return JSONResponse(
        status_code=exc.status_code,
        headers=exc.headers,
        content={
            "success": False,
            "detail": exc.detail,
            "error_code": exc.error_code,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Normalize Pydantic request body validation errors.
    """
    errors = []
    for error in exc.errors():
        loc = " -> ".join(str(l) for l in error.get("loc", []))
        msg = error.get("msg")
        errors.append(f"{loc}: {msg}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "detail": "Input validation failed: " + " | ".join(errors),
            "error_code": "VALIDATION_FAILED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Catch any unhandled system exceptions.
    """
    logger.exception(f"Unhandled server exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "detail": "An unexpected server error occurred.",
            "error_code": "INTERNAL_SERVER_ERROR",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "healthy",
        "docs": "/docs"
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=status.HTTP_204_NO_CONTENT)
