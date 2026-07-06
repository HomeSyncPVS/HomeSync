import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, or_, and_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.family_member import FamilyMember
from app.models.vehicle import Vehicle
from app.models.emergency_contact import EmergencyContact
from app.models.notification import Notification
from app.models.flat import Flat
from app.models.society import Society
from app.models.bill import MaintenanceBill
from app.models.complaint import Complaint
from app.models.notice import Notice
from app.models.event import Event

from app.repositories.user import UserRepository
from app.repositories.family_member import FamilyMemberRepository
from app.repositories.vehicle import VehicleRepository
from app.repositories.emergency_contact import EmergencyContactRepository
from app.repositories.notification import NotificationRepository
from app.repositories.flat import FlatRepository

from app.schemas.resident import (
    FamilyMemberCreate,
    FamilyMemberUpdate,
    VehicleCreate,
    VehicleUpdate,
    EmergencyContactCreate,
    EmergencyContactUpdate,
)
from app.exceptions.custom import NotFoundError, ConflictError, ValidationError

user_repo = UserRepository()
flat_repo = FlatRepository()
family_member_repo = FamilyMemberRepository()
vehicle_repo = VehicleRepository()
emergency_contact_repo = EmergencyContactRepository()
notification_repo = NotificationRepository()


class ResidentService:
    @staticmethod
    async def get_resident_profile(db: AsyncSession, user_id: uuid.UUID) -> User:
        """
        Retrieve resident profile with all relationships.
        """
        query = (
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.family_members),
                selectinload(User.vehicles),
                selectinload(User.flat),
            )
        )
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError(detail="Resident profile not found.", error_code="RESIDENT_NOT_FOUND")
        return user

    @staticmethod
    async def search_residents(
        db: AsyncSession,
        society_id: uuid.UUID,
        search_query: Optional[str] = None,
        wing_id: Optional[uuid.UUID] = None,
        floor_id: Optional[uuid.UUID] = None,
        approval_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[User]:
        """
        Search residents within a society using filters.
        """
        # Select users who belong to the society and have the role 'Resident' or are residents
        # We need to load their flat details as well
        query = (
            select(User)
            .where(User.society_id == society_id)
            .options(selectinload(User.flat))
        )

        if approval_status:
            query = query.where(User.approval_status == approval_status.upper().strip())

        if wing_id or floor_id or search_query:
            # We must join with Flat to filter by wing/floor or flat number
            query = query.join(User.flat, isouter=True)

        if wing_id:
            query = query.where(Flat.wing_id == wing_id)
        if floor_id:
            query = query.where(Flat.floor_id == floor_id)

        if search_query:
            search_pattern = f"%{search_query}%"
            query = query.where(
                or_(
                    User.full_name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.phone.ilike(search_pattern),
                    Flat.flat_number.ilike(search_pattern),
                )
            )

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def approve_resident(
        db: AsyncSession, resident_id: uuid.UUID, status: str, society_id: uuid.UUID
    ) -> User:
        """
        Approve or reject a resident's access request.
        """
        user = await user_repo.get(db, resident_id)
        if not user or user.society_id != society_id:
            raise NotFoundError(detail="Resident not found in this society.", error_code="RESIDENT_NOT_FOUND")

        status_upper = status.upper().strip()
        if status_upper not in ["APPROVED", "REJECTED"]:
            raise ValidationError(detail="Invalid status. Must be APPROVED or REJECTED.")

        user.approval_status = status_upper
        db.add(user)

        # If approved, update occupancy status of the flat to OCCUPIED_OWNER (or similar)
        if status_upper == "APPROVED" and user.flat_id:
            flat = await flat_repo.get(db, user.flat_id)
            if flat:
                flat.occupancy_status = "OCCUPIED_OWNER"
                db.add(flat)

        await db.flush()
        return user

    @staticmethod
    async def get_dashboard_data(db: AsyncSession, user: User) -> dict:
        """
        Aggregate dashboard counts and totals for a resident.
        """
        now = datetime.now(timezone.utc)

        # 1. Bills (unpaid maintenance bills linked to resident's flat)
        unpaid_bills_count = 0
        unpaid_bills_amount = 0.0
        if user.flat_id:
            bills_query = select(MaintenanceBill).where(
                MaintenanceBill.flat_id == user.flat_id,
                MaintenanceBill.status != "PAID",
                MaintenanceBill.status != "CANCELLED",
            )
            bills_result = await db.execute(bills_query)
            bills = list(bills_result.scalars().all())
            unpaid_bills_count = len(bills)
            unpaid_bills_amount = sum(b.total_amount - b.paid_amount for b in bills)

        # 2. Active complaints (created by this user)
        complaints_query = select(func.count(Complaint.id)).where(
            Complaint.user_id == user.id,
            Complaint.status != "CLOSED",
            Complaint.status != "RESOLVED",
        )
        complaints_result = await db.execute(complaints_query)
        active_complaints_count = complaints_result.scalar() or 0

        # 3. Active notices
        notices_query = select(func.count(Notice.id)).where(
            Notice.society_id == user.society_id,
            Notice.deleted_at.is_(None),
            or_(Notice.expires_at.is_(None), Notice.expires_at > now),
        )
        notices_result = await db.execute(notices_query)
        recent_notices_count = notices_result.scalar() or 0

        # 4. Upcoming events
        events_query = select(func.count(Event.id)).where(
            Event.society_id == user.society_id,
            Event.date_time >= now,
        )
        # Event model has deleted_at check (some event models use soft delete)
        if hasattr(Event, "deleted_at"):
            events_query = events_query.where(Event.deleted_at.is_(None))

        events_result = await db.execute(events_query)
        upcoming_events_count = events_result.scalar() or 0

        return {
            "unpaid_bills_count": unpaid_bills_count,
            "unpaid_bills_amount": unpaid_bills_amount,
            "active_complaints_count": active_complaints_count,
            "recent_notices_count": recent_notices_count,
            "upcoming_events_count": upcoming_events_count,
        }

    # ==========================================
    # FAMILY MEMBER BUSINESS LOGIC
    # ==========================================

    @staticmethod
    async def get_family_members(db: AsyncSession, user_id: uuid.UUID) -> List[FamilyMember]:
        return await family_member_repo.get_by_user(db, str(user_id))

    @staticmethod
    async def add_family_member(
        db: AsyncSession, user_id: uuid.UUID, data: FamilyMemberCreate
    ) -> FamilyMember:
        member = FamilyMember(
            user_id=user_id,
            full_name=data.full_name,
            relationship=data.relationship,
            phone=data.phone,
            email=data.email,
        )
        return await family_member_repo.create(db, obj_in=member)

    @staticmethod
    async def update_family_member(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID, data: FamilyMemberUpdate
    ) -> FamilyMember:
        member = await family_member_repo.get(db, member_id)
        if not member or member.user_id != user_id:
            raise NotFoundError(detail="Family member not found.", error_code="MEMBER_NOT_FOUND")
        return await family_member_repo.update(db, db_obj=member, obj_in=data)

    @staticmethod
    async def delete_family_member(
        db: AsyncSession, user_id: uuid.UUID, member_id: uuid.UUID
    ) -> FamilyMember:
        member = await family_member_repo.get(db, member_id)
        if not member or member.user_id != user_id:
            raise NotFoundError(detail="Family member not found.", error_code="MEMBER_NOT_FOUND")
        return await family_member_repo.delete(db, id=member_id)

    # ==========================================
    # VEHICLE BUSINESS LOGIC
    # ==========================================

    @staticmethod
    async def get_vehicles(db: AsyncSession, user_id: uuid.UUID) -> List[Vehicle]:
        return await vehicle_repo.get_by_user(db, str(user_id))

    @staticmethod
    async def add_vehicle(db: AsyncSession, user_id: uuid.UUID, data: VehicleCreate) -> Vehicle:
        # Check duplicate vehicle number
        existing = await vehicle_repo.get_by_number(db, data.vehicle_number)
        if existing:
            raise ConflictError(
                detail="Vehicle with this number is already registered.",
                error_code="VEHICLE_ALREADY_REGISTERED",
            )
        vehicle = Vehicle(
            user_id=user_id,
            vehicle_number=data.vehicle_number,
            vehicle_type=data.vehicle_type,
            make_model=data.make_model,
            parking_slot=data.parking_slot,
        )
        return await vehicle_repo.create(db, obj_in=vehicle)

    @staticmethod
    async def update_vehicle(
        db: AsyncSession, user_id: uuid.UUID, vehicle_id: uuid.UUID, data: VehicleUpdate
    ) -> Vehicle:
        vehicle = await vehicle_repo.get(db, vehicle_id)
        if not vehicle or vehicle.user_id != user_id:
            raise NotFoundError(detail="Vehicle not found.", error_code="VEHICLE_NOT_FOUND")

        if data.vehicle_number and data.vehicle_number != vehicle.vehicle_number:
            existing = await vehicle_repo.get_by_number(db, data.vehicle_number)
            if existing:
                raise ConflictError(
                    detail="Vehicle with this number is already registered.",
                    error_code="VEHICLE_ALREADY_REGISTERED",
                )

        return await vehicle_repo.update(db, db_obj=vehicle, obj_in=data)

    @staticmethod
    async def delete_vehicle(db: AsyncSession, user_id: uuid.UUID, vehicle_id: uuid.UUID) -> Vehicle:
        vehicle = await vehicle_repo.get(db, vehicle_id)
        if not vehicle or vehicle.user_id != user_id:
            raise NotFoundError(detail="Vehicle not found.", error_code="VEHICLE_NOT_FOUND")
        return await vehicle_repo.delete(db, id=vehicle_id)

    # ==========================================
    # EMERGENCY CONTACT BUSINESS LOGIC
    # ==========================================

    @staticmethod
    async def get_emergency_contacts(
        db: AsyncSession, society_id: uuid.UUID, user_id: Optional[uuid.UUID] = None
    ) -> List[EmergencyContact]:
        return await emergency_contact_repo.get_by_society(
            db, str(society_id), str(user_id) if user_id else None
        )

    @staticmethod
    async def add_emergency_contact(
        db: AsyncSession, society_id: uuid.UUID, data: EmergencyContactCreate
    ) -> EmergencyContact:
        contact = EmergencyContact(
            society_id=society_id,
            user_id=data.user_id,
            name=data.name,
            role_or_service=data.role_or_service,
            phone=data.phone,
            email=data.email,
        )
        return await emergency_contact_repo.create(db, obj_in=contact)

    @staticmethod
    async def update_emergency_contact(
        db: AsyncSession,
        society_id: uuid.UUID,
        contact_id: uuid.UUID,
        data: EmergencyContactUpdate,
    ) -> EmergencyContact:
        contact = await emergency_contact_repo.get(db, contact_id)
        if not contact or contact.society_id != society_id:
            raise NotFoundError(detail="Emergency contact not found.", error_code="CONTACT_NOT_FOUND")
        return await emergency_contact_repo.update(db, db_obj=contact, obj_in=data)

    @staticmethod
    async def delete_emergency_contact(
        db: AsyncSession, society_id: uuid.UUID, contact_id: uuid.UUID
    ) -> EmergencyContact:
        contact = await emergency_contact_repo.get(db, contact_id)
        if not contact or contact.society_id != society_id:
            raise NotFoundError(detail="Emergency contact not found.", error_code="CONTACT_NOT_FOUND")
        return await emergency_contact_repo.delete(db, id=contact_id)

    # ==========================================
    # NOTIFICATION BUSINESS LOGIC
    # ==========================================

    @staticmethod
    async def get_notifications(
        db: AsyncSession, user_id: uuid.UUID, unread_only: bool = False
    ) -> List[Notification]:
        return await notification_repo.get_by_user(db, str(user_id), unread_only)

    @staticmethod
    async def mark_notification_read(
        db: AsyncSession, user_id: uuid.UUID, notification_id: uuid.UUID
    ) -> Notification:
        notification = await notification_repo.get(db, notification_id)
        if not notification or notification.user_id != user_id:
            raise NotFoundError(detail="Notification not found.", error_code="NOTIFICATION_NOT_FOUND")
        if not notification.read_at:
            notification.read_at = datetime.now(timezone.utc)
            db.add(notification)
            await db.flush()
        return notification
