from typing import Optional, List
import uuid
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.complaint import Complaint, ComplaintAttachment


class ComplaintRepository(BaseRepository[Complaint]):
    def __init__(self):
        super().__init__(Complaint)

    async def get_with_attachments(self, db: AsyncSession, id: uuid.UUID) -> Optional[Complaint]:
        """
        Fetch a complaint by ID with its attachments preloaded.
        """
        query = select(Complaint).where(Complaint.id == id, Complaint.deleted_at == None).options(
            selectinload(Complaint.attachments)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_all_by_society(self, db: AsyncSession, society_id: uuid.UUID) -> List[Complaint]:
        """
        Fetch all complaints for a society with attachments preloaded.
        """
        query = select(Complaint).where(Complaint.society_id == society_id, Complaint.deleted_at == None).options(
            selectinload(Complaint.attachments)
        ).order_by(Complaint.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_all_by_user(self, db: AsyncSession, user_id: uuid.UUID) -> List[Complaint]:
        """
        Fetch all complaints raised by a specific user.
        """
        query = select(Complaint).where(Complaint.user_id == user_id, Complaint.deleted_at == None).options(
            selectinload(Complaint.attachments)
        ).order_by(Complaint.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())


class ComplaintAttachmentRepository(BaseRepository[ComplaintAttachment]):
    def __init__(self):
        super().__init__(ComplaintAttachment)
