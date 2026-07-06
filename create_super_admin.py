import asyncio
import uuid
from app.db.database import AsyncSessionLocal
from app.models.user import User
from app.repositories.role import RoleRepository
from app.repositories.user import UserRepository
from app.core.security import get_password_hash
from app.core.config import settings

async def create_super_admin(email: str, password: str, full_name: str):
    """
    Creates a Super Admin user in the database.
    """
    async with AsyncSessionLocal() as db:
        role_repo = RoleRepository()
        user_repo = UserRepository()

        # 1. Retrieve Super Admin Role ID
        super_admin_role = await role_repo.get_by_name(db, name="Super Admin")
        if not super_admin_role:
            print("Error: 'Super Admin' role not found. Please ensure it exists in the database.")
            return

        # 2. Hash the Password
        hashed_password = get_password_hash(password)

        # 3. Construct User Object
        super_admin_user = User(
            id=uuid.uuid4(),
            email=email,
            phone=None,  # Optional, can be set if needed
            hashed_password=hashed_password,
            full_name=full_name,
            role_id=super_admin_role.id,
            society_id=None,  # Super Admin is not tied to a specific society
            is_active=True,
            is_verified=True,
            approval_status="APPROVED",
        )

        # 4. Save User to Database
        try:
            created_user = await user_repo.create(db, obj_in=super_admin_user)
            await db.commit()
            print(f"Super Admin user '{created_user.email}' created successfully with ID: {created_user.id}")
        except Exception as e:
            await db.rollback()
            print(f"Error creating Super Admin user: {e}")

if __name__ == "__main__":
    # You can change these values for your Super Admin user
    admin_email = "noreply@homesyncofficial@gmail.com"
    admin_password = "PVS@12345."
    admin_full_name = "Super Admin"

    print(f"Attempting to create Super Admin user: {admin_email}")
    asyncio.run(create_super_admin(admin_email, admin_password, admin_full_name))