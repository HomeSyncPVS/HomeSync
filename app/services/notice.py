import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notice import Notice
from app.repositories.notice import NoticeRepository
from app.schemas.notice import NoticeCreate, NoticeUpdate
from app.exceptions.custom import NotFoundError

notice_repo = NoticeRepository()


class NoticeService:
    @staticmethod
    async def create_notice(db: AsyncSession, data: NoticeCreate, current_user_id: uuid.UUID) -> Notice:
        """
        Publish a new society notice.
        """
        new_notice = Notice(
            society_id=data.society_id,
            title=data.title,
            content=data.content,
            notice_type=data.notice_type,
            target_group=data.target_group,
            attachment_url=data.attachment_url,
            expires_at=data.expires_at,
            created_by=current_user_id,
            updated_by=current_user_id,
        )
        notice = await notice_repo.create(db, obj_in=new_notice)
        await db.flush()
        return notice

    @staticmethod
    async def update_notice(
        db: AsyncSession,
        notice_id: uuid.UUID,
        data: NoticeUpdate,
        current_user_id: uuid.UUID
    ) -> Notice:
        """
        Update an existing notice.
        """
        notice = await notice_repo.get(db, id=notice_id)
        if not notice or notice.deleted_at is not None:
            raise NotFoundError(detail="Notice not found.", error_code="NOTICE_NOT_FOUND")

        update_dict = data.model_dump(exclude_unset=True)
        update_dict["updated_by"] = current_user_id
        update_dict["updated_at"] = datetime.now(timezone.utc)

        notice = await notice_repo.update(db, db_obj=notice, obj_in=update_dict)
        await db.flush()
        return notice

    @staticmethod
    async def delete_notice(db: AsyncSession, notice_id: uuid.UUID, current_user_id: uuid.UUID) -> Notice:
        """
        Soft-delete a notice.
        """
        notice = await notice_repo.get(db, id=notice_id)
        if not notice or notice.deleted_at is not None:
            raise NotFoundError(detail="Notice not found.", error_code="NOTICE_NOT_FOUND")

        notice.deleted_at = datetime.now(timezone.utc)
        notice.updated_by = current_user_id
        db.add(notice)
        await db.flush()
        return notice

    @staticmethod
    async def get_notice(db: AsyncSession, notice_id: uuid.UUID) -> Notice:
        """
        Get notice by ID.
        """
        notice = await notice_repo.get(db, id=notice_id)
        if not notice or notice.deleted_at is not None:
            raise NotFoundError(detail="Notice not found.", error_code="NOTICE_NOT_FOUND")
        return notice

    @staticmethod
    async def get_active_notices(db: AsyncSession, society_id: uuid.UUID) -> List[Notice]:
        """
        Get all active notices.
        """
        return await notice_repo.get_active_notices(db, society_id)

    @staticmethod
    async def get_all_notices(db: AsyncSession, society_id: uuid.UUID) -> List[Notice]:
        """
        Get all notices including expired ones (Notice Archive).
        """
        return await notice_repo.get_all_by_society(db, society_id)
