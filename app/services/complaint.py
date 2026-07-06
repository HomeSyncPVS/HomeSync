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

        new_complaint = Complaint(
            complaint_number=complaint_number,
            society_id=data.society_id,
            user_id=current_user_id,
            title=data.title,
            description=data.description,
            category=data.category,
            priority=data.priority,
            status="RAISED",
            location=data.location,
        )
        complaint = await complaint_repo.create(db, obj_in=new_complaint)
        await db.flush()

        # Handle attachments (Max 5 files)
        if data.attachment_urls:
            for url in data.attachment_urls[:5]:
                # Extract simple file type from extension
                file_type = url.split(".")[-1].lower() if "." in url else "unknown"
                new_attach = ComplaintAttachment(
                    complaint_id=complaint.id,
                    file_url=url,
                    file_type=file_type
                )
                await attachment_repo.create(db, obj_in=new_attach)
            await db.flush()

        # Fetch fully loaded complaint with attachments
        return await complaint_repo.get_with_attachments(db, complaint.id)

    @staticmethod
    async def update_complaint(
        db: AsyncSession,
        complaint_id: uuid.UUID,
        data: ComplaintUpdate,
        current_user_id: uuid.UUID
    ) -> Complaint:
        """
        Update complaint fields (priority, status, assigned vendor, etc.)
        """
        complaint = await complaint_repo.get_with_attachments(db, complaint_id)
        if not complaint or complaint.deleted_at is not None:
            raise NotFoundError(detail="Complaint not found.", error_code="COMPLAINT_NOT_FOUND")

        update_dict = data.model_dump(exclude_unset=True)

        if "status" in update_dict:
            new_status = update_dict["status"].upper()
            update_dict["status"] = new_status
            if new_status == "RESOLVED":
                update_dict["resolved_at"] = datetime.now(timezone.utc)
            elif new_status in ["RAISED", "ASSIGNED", "IN_PROGRESS"]:
                update_dict["resolved_at"] = None

        complaint = await complaint_repo.update(db, db_obj=complaint, obj_in=update_dict)
        await db.flush()
        return await complaint_repo.get_with_attachments(db, complaint.id)

    @staticmethod
    async def close_complaint(db: AsyncSession, complaint_id: uuid.UUID, current_user_id: uuid.UUID) -> Complaint:
        """
        Mark a resolved complaint as closed.
        """
        complaint = await complaint_repo.get(db, id=complaint_id)
        if not complaint or complaint.deleted_at is not None:
            raise NotFoundError(detail="Complaint not found.", error_code="COMPLAINT_NOT_FOUND")

        complaint.status = "CLOSED"
        db.add(complaint)
        await db.flush()
        return await complaint_repo.get_with_attachments(db, complaint_id)

    @staticmethod
    async def reopen_complaint(db: AsyncSession, complaint_id: uuid.UUID, current_user_id: uuid.UUID) -> Complaint:
        """
        Reopen a resolved/closed complaint.
        """
        complaint = await complaint_repo.get(db, id=complaint_id)
        if not complaint or complaint.deleted_at is not None:
            raise NotFoundError(detail="Complaint not found.", error_code="COMPLAINT_NOT_FOUND")

        complaint.status = "ASSIGNED" if complaint.vendor_id else "RAISED"
        complaint.resolved_at = None
        complaint.estimated_resolution_date = None
        db.add(complaint)
        await db.flush()
        return await complaint_repo.get_with_attachments(db, complaint_id)

    @staticmethod
    async def get_complaint(db: AsyncSession, complaint_id: uuid.UUID) -> Complaint:
        """
        Get complaint by ID.
        """
        complaint = await complaint_repo.get_with_attachments(db, complaint_id)
        if not complaint or complaint.deleted_at is not None:
            raise NotFoundError(detail="Complaint not found.", error_code="COMPLAINT_NOT_FOUND")
        return complaint

    @staticmethod
    async def list_complaints(
        db: AsyncSession,
        society_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None
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
        return complaint
