import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, String, Float, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    society_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("societies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bill_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("maintenance_bills.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    flat_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("flats.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    payment_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)  # Enum: PaymentMethod
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")  # Enum: PaymentStatus
    transaction_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    refunded_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    refund_reason: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

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
    society: Mapped["Society"] = relationship("Society")
    flat: Mapped["Flat"] = relationship("Flat")
    bill: Mapped[Optional["MaintenanceBill"]] = relationship("MaintenanceBill", back_populates="payments")
    receipt: Mapped[Optional["PaymentReceipt"]] = relationship(
        "PaymentReceipt", back_populates="payment", uselist=False, cascade="all, delete-orphan"
    )


class PaymentReceipt(Base):
    __tablename__ = "payment_receipts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    receipt_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    payment: Mapped[Payment] = relationship("Payment", back_populates="receipt")
