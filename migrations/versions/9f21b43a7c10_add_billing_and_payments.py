"""add_billing_and_payments

Revision ID: 9f21b43a7c10
Revises: 067dd28b623a
Create Date: 2026-07-06 18:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f21b43a7c10"
down_revision: Union[str, Sequence[str], None] = "067dd28b623a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "maintenance_bills",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("society_id", sa.UUID(), nullable=False),
        sa.Column("flat_id", sa.UUID(), nullable=False),
        sa.Column("bill_number", sa.String(length=50), nullable=False),
        sa.Column("bill_type", sa.String(length=50), nullable=False),
        sa.Column("billing_period", sa.String(length=20), nullable=False),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("subtotal_amount", sa.Float(), nullable=False),
        sa.Column("late_fee_amount", sa.Float(), nullable=False),
        sa.Column("total_amount", sa.Float(), nullable=False),
        sa.Column("paid_amount", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["flat_id"], ["flats.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["society_id"], ["societies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("society_id", "bill_number", name="uq_bill_society_number"),
    )
    op.create_index(op.f("ix_maintenance_bills_deleted_at"), "maintenance_bills", ["deleted_at"], unique=False)
    op.create_index(op.f("ix_maintenance_bills_due_date"), "maintenance_bills", ["due_date"], unique=False)
    op.create_index(op.f("ix_maintenance_bills_flat_id"), "maintenance_bills", ["flat_id"], unique=False)
    op.create_index(op.f("ix_maintenance_bills_status"), "maintenance_bills", ["status"], unique=False)
    op.create_index(op.f("ix_maintenance_bills_billing_period"), "maintenance_bills", ["billing_period"], unique=False)
    op.create_index(op.f("ix_maintenance_bills_society_id"), "maintenance_bills", ["society_id"], unique=False)

    op.create_table(
        "bill_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("bill_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["bill_id"], ["maintenance_bills.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_bill_items_bill_id"), "bill_items", ["bill_id"], unique=False)

    op.create_table(
        "payments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("bill_id", sa.UUID(), nullable=False),
        sa.Column("society_id", sa.UUID(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("method", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("gateway_order_id", sa.String(length=255), nullable=True),
        sa.Column("gateway_payment_id", sa.String(length=255), nullable=True),
        sa.Column("gateway_signature", sa.String(length=255), nullable=True),
        sa.Column("transaction_reference", sa.String(length=255), nullable=True),
        sa.Column("gateway_response", sa.Text(), nullable=True),
        sa.Column("refunded_amount", sa.Float(), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["bill_id"], ["maintenance_bills.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["society_id"], ["societies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_payments_bill_id"), "payments", ["bill_id"], unique=False)
    op.create_index(op.f("ix_payments_created_at"), "payments", ["created_at"], unique=False)
    op.create_index(op.f("ix_payments_deleted_at"), "payments", ["deleted_at"], unique=False)
    op.create_index(op.f("ix_payments_gateway_order_id"), "payments", ["gateway_order_id"], unique=False)
    op.create_index(op.f("ix_payments_gateway_payment_id"), "payments", ["gateway_payment_id"], unique=False)
    op.create_index(op.f("ix_payments_society_id"), "payments", ["society_id"], unique=False)
    op.create_index(op.f("ix_payments_status"), "payments", ["status"], unique=False)
    op.create_index(op.f("ix_payments_transaction_reference"), "payments", ["transaction_reference"], unique=False)

    op.create_table(
        "payment_receipts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("payment_id", sa.UUID(), nullable=False),
        sa.Column("receipt_number", sa.String(length=100), nullable=False),
        sa.Column("receipt_url", sa.String(length=512), nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("payment_id"),
        sa.UniqueConstraint("receipt_number"),
    )
    op.create_index(op.f("ix_payment_receipts_payment_id"), "payment_receipts", ["payment_id"], unique=True)
    op.create_index(op.f("ix_payment_receipts_receipt_number"), "payment_receipts", ["receipt_number"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_payment_receipts_receipt_number"), table_name="payment_receipts")
    op.drop_index(op.f("ix_payment_receipts_payment_id"), table_name="payment_receipts")
    op.drop_table("payment_receipts")

    op.drop_index(op.f("ix_payments_transaction_reference"), table_name="payments")
    op.drop_index(op.f("ix_payments_status"), table_name="payments")
    op.drop_index(op.f("ix_payments_society_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_gateway_payment_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_gateway_order_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_deleted_at"), table_name="payments")
    op.drop_index(op.f("ix_payments_created_at"), table_name="payments")
    op.drop_index(op.f("ix_payments_bill_id"), table_name="payments")
    op.drop_table("payments")

    op.drop_index(op.f("ix_bill_items_bill_id"), table_name="bill_items")
    op.drop_table("bill_items")

    op.drop_index(op.f("ix_maintenance_bills_society_id"), table_name="maintenance_bills")
    op.drop_index(op.f("ix_maintenance_bills_billing_period"), table_name="maintenance_bills")
    op.drop_index(op.f("ix_maintenance_bills_status"), table_name="maintenance_bills")
    op.drop_index(op.f("ix_maintenance_bills_flat_id"), table_name="maintenance_bills")
    op.drop_index(op.f("ix_maintenance_bills_due_date"), table_name="maintenance_bills")
    op.drop_index(op.f("ix_maintenance_bills_deleted_at"), table_name="maintenance_bills")
    op.drop_table("maintenance_bills")
