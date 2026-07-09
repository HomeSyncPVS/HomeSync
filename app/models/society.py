import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, String, ForeignKey, Integer, Float, Boolean, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class Society(Base):
    __tablename__ = "societies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    region: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[str] = mapped_column(String(6), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    banner_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    join_code: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True, index=True)

    # Soft Delete & Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    settings: Mapped["SocietySettings"] = relationship(
        "SocietySettings", back_populates="society", uselist=False, cascade="all, delete-orphan"
    )
    wings: Mapped[list["Wing"]] = relationship(
        "Wing", back_populates="society", cascade="all, delete-orphan"
    )
    flats: Mapped[list["Flat"]] = relationship(
        "Flat", back_populates="society", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("name", "region", name="uq_society_name_region"),
    )


class SocietySettings(Base):
    __tablename__ = "society_settings"

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
    
    maintenance_due_day: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    late_fee_percentage: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    allow_visitor_auto_approve: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    enable_gate_pass: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    visitor_validation_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    amenity_booking_advance_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    emergency_contact_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Soft Delete & Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    society: Mapped[Society] = relationship("Society", back_populates="settings")
