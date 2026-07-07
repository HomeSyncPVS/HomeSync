import uuid
from typing import List, Optional
from datetime import datetime, timezone
import random
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.complaint import Complaint, ComplaintAttachment
from app.repositories.complaint import ComplaintRepository, ComplaintAttachmentRepository
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate
from app.exceptions.custom import NotFoundError, ForbiddenError

complaint_repo = ComplaintRepository()
attachment_repo = ComplaintAttachmentRepository()


class ComplaintService:
    @staticmethod
    async def create_complaint(db: AsyncSession, data: ComplaintCreate, current_user_id: uuid.UUID) -> Complaint:
        """
        Create a new complaint ticket with optional file attachments.
        """
        # Generate complaint number: COMP-YYYYMMDD-XXXX
        today = datetime.now(timezone.utc).strftime("%Y%m%d")
        rand_suffix = "".join(random.choices("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=4))
        complaint_number = f"COMP-{today}-{rand_suffix}"

        complaint = Complaint(
            society_id=data.society_id,
            user_id=current_user_id,
            complaint_number=complaint_number,
            title=data.title,
            description=data.description,
            category=data.category,
            priority=data.priority,
            status="OPEN",
            location=data.location,
        )
        db.add(complaint)
        await db.flush()

        attachments = []
        if data.attachment_urls:
            for url in data.attachment_urls:
                ext = url.split(".")[-1].lower() if "." in url else "jpg"
                file_type = f"image/{ext}" if ext in ["jpg", "jpeg", "png", "webp", "gif"] else "application/octet-stream"
                att = ComplaintAttachment(
                    complaint_id=complaint.id,
                    file_url=url,
                    file_type=file_type
                )
                db.add(att)
                attachments.append(att)
            await db.flush()

        # Directly set on __dict__ to avoid lazy loading trigger in SQLAlchemy
        complaint.__dict__["attachments"] = attachments
        return complaint

    @staticmethod
    async def get_complaint(db: AsyncSession, complaint_id: uuid.UUID) -> Complaint:
        """
        Fetch a single complaint by ID.
        """
        complaint = await complaint_repo.get(db, id=complaint_id)
        if not complaint or complaint.deleted_at is not None:
            raise NotFoundError(detail="Complaint not found.", error_code="COMPLAINT_NOT_FOUND")
        return complaint

    @staticmethod
    async def update_complaint(
        db: AsyncSession,
        complaint_id: uuid.UUID,
        data: ComplaintUpdate,
        current_user_id: uuid.UUID,
        is_admin: bool = False,
    ) -> Complaint:
        """
        Update a complaint ticket (e.g. status, details, assignment).
        """
        complaint = await complaint_repo.get(db, id=complaint_id)
        if not complaint or complaint.deleted_at is not None:
            raise NotFoundError(detail="Complaint not found.", error_code="COMPLAINT_NOT_FOUND")

        update_data = data.model_dump(exclude_unset=True)

        # Residents cannot update status/priority/resolution date
        if not is_admin:
            for field in ["status", "priority", "estimated_resolution_date"]:
                update_data.pop(field, None)

        # If being resolved, set resolved_at timestamp
        if "status" in update_data and update_data["status"] == "RESOLVED":
            complaint.resolved_at = datetime.now(timezone.utc)

        complaint = await complaint_repo.update(db, db_obj=complaint, obj_in=update_data)
        await db.flush()
        await db.refresh(complaint)
        if "attachments" not in complaint.__dict__:
            complaint.__dict__["attachments"] = []
        return complaint

    @staticmethod
    async def close_complaint(db: AsyncSession, complaint_id: uuid.UUID, current_user_id: uuid.UUID) -> Complaint:
        """
        Close a complaint ticket.
        """
        complaint = await complaint_repo.get(db, id=complaint_id)
        if not complaint or complaint.deleted_at is not None:
            raise NotFoundError(detail="Complaint not found.", error_code="COMPLAINT_NOT_FOUND")

        complaint.status = "CLOSED"
        db.add(complaint)
        await db.flush()
        await db.refresh(complaint)
        if "attachments" not in complaint.__dict__:
            complaint.__dict__["attachments"] = []
        return complaint


    @staticmethod
    async def list_complaints(
        db: AsyncSession,
        society_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Complaint]:
        """
        Get all complaints for a society, optionally filtered by the reporting user.
        """
        if user_id:
            return await complaint_repo.get_all_by_user(db, user_id)
        return await complaint_repo.get_all_by_society(db, society_id)

    @staticmethod
    async def delete_complaint(db: AsyncSession, complaint_id: uuid.UUID, current_user_id: uuid.UUID) -> Complaint:
        """
        Soft-delete a complaint ticket.
        """
        complaint = await complaint_repo.get(db, id=complaint_id)
        if not complaint or complaint.deleted_at is not None:
            raise NotFoundError(detail="Complaint not found.", error_code="COMPLAINT_NOT_FOUND")

        complaint.deleted_at = datetime.now(timezone.utc)
        db.add(complaint)
        await db.flush()
        await db.refresh(complaint)
        if "attachments" not in complaint.__dict__:
            complaint.__dict__["attachments"] = []
        return complaint
