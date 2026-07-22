import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, String, ForeignKey, Integer, Float, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("societies.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    
    plan_name: Mapped[str] = mapped_column(String(50), default="Free", nullable=False) # Free, Standard, Professional, Enterprise
    total_flats: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    price_per_year: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    ad_level: Mapped[str] = mapped_column(String(50), default="Free", nullable=False) # Free, Standard, Professional, Enterprise (ad-free)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    end_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationship
    society = relationship("Society", backref="subscription", uselist=False)
