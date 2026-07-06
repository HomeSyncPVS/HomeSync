"""add_operations_models

Revision ID: 44578497fb58
Revises: b7d7d4a2bc9c
Create Date: 2026-07-06 16:18:59.986363

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '44578497fb58'
down_revision: Union[str, Sequence[str], None] = 'b7d7d4a2bc9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('events',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('society_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('date_time', sa.DateTime(timezone=True), nullable=False),
    sa.Column('duration_minutes', sa.Integer(), nullable=False),
    sa.Column('location', sa.String(length=255), nullable=False),
    sa.Column('poster_url', sa.String(length=512), nullable=True),
    sa.Column('rsvp_deadline', sa.DateTime(timezone=True), nullable=False),
    sa.Column('capacity', sa.Integer(), nullable=True),
    sa.Column('entry_fee', sa.Float(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_by', sa.UUID(), nullable=True),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['society_id'], ['societies.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_events_deleted_at'), 'events', ['deleted_at'], unique=False)
    op.create_index(op.f('ix_events_society_id'), 'events', ['society_id'], unique=False)

    op.create_table('notices',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('society_id', sa.UUID(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('notice_type', sa.String(length=50), nullable=False),
    sa.Column('target_group', sa.String(length=100), nullable=False),
    sa.Column('attachment_url', sa.String(length=512), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_by', sa.UUID(), nullable=True),
    sa.Column('updated_by', sa.UUID(), nullable=True),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['society_id'], ['societies.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notices_deleted_at'), 'notices', ['deleted_at'], unique=False)
    op.create_index(op.f('ix_notices_expires_at'), 'notices', ['expires_at'], unique=False)
    op.create_index(op.f('ix_notices_notice_type'), 'notices', ['notice_type'], unique=False)
    op.create_index(op.f('ix_notices_society_id'), 'notices', ['society_id'], unique=False)

    op.create_table('vendors',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('society_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('phone', sa.String(length=50), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=True),
    sa.Column('category', sa.String(length=100), nullable=False),
    sa.Column('experience', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('rating', sa.Float(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_by', sa.UUID(), nullable=True),
    sa.Column('updated_by', sa.UUID(), nullable=True),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['society_id'], ['societies.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('society_id', 'phone', name='uq_vendor_society_phone')
    )
    op.create_index(op.f('ix_vendors_deleted_at'), 'vendors', ['deleted_at'], unique=False)
    op.create_index(op.f('ix_vendors_phone'), 'vendors', ['phone'], unique=False)
    op.create_index(op.f('ix_vendors_society_id'), 'vendors', ['society_id'], unique=False)

    op.create_table('complaints',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('complaint_number', sa.String(length=100), nullable=False),
    sa.Column('society_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('vendor_id', sa.UUID(), nullable=True),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('category', sa.String(length=100), nullable=False),
    sa.Column('priority', sa.String(length=50), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('location', sa.String(length=255), nullable=True),
    sa.Column('estimated_resolution_date', sa.DateTime(timezone=True), nullable=True),
    sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['society_id'], ['societies.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_complaints_category'), 'complaints', ['category'], unique=False)
    op.create_index(op.f('ix_complaints_complaint_number'), 'complaints', ['complaint_number'], unique=True)
    op.create_index(op.f('ix_complaints_deleted_at'), 'complaints', ['deleted_at'], unique=False)
    op.create_index(op.f('ix_complaints_priority'), 'complaints', ['priority'], unique=False)
    op.create_index(op.f('ix_complaints_society_id'), 'complaints', ['society_id'], unique=False)
    op.create_index(op.f('ix_complaints_status'), 'complaints', ['status'], unique=False)
    op.create_index(op.f('ix_complaints_user_id'), 'complaints', ['user_id'], unique=False)
    op.create_index(op.f('ix_complaints_vendor_id'), 'complaints', ['vendor_id'], unique=False)

    op.create_table('event_rsvps',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('event_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('additional_guests', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('event_id', 'user_id', name='uq_event_user_rsvp')
    )
    op.create_index(op.f('ix_event_rsvps_event_id'), 'event_rsvps', ['event_id'], unique=False)
    op.create_index(op.f('ix_event_rsvps_user_id'), 'event_rsvps', ['user_id'], unique=False)

    op.create_table('vendor_ratings',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('vendor_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('rating', sa.Integer(), nullable=False),
    sa.Column('feedback', sa.String(length=1000), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vendor_ratings_user_id'), 'vendor_ratings', ['user_id'], unique=False)
    op.create_index(op.f('ix_vendor_ratings_vendor_id'), 'vendor_ratings', ['vendor_id'], unique=False)

    op.create_table('complaint_attachments',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('complaint_id', sa.UUID(), nullable=False),
    sa.Column('file_url', sa.String(length=512), nullable=False),
    sa.Column('file_type', sa.String(length=50), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_complaint_attachments_complaint_id'), 'complaint_attachments', ['complaint_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_complaint_attachments_complaint_id'), table_name='complaint_attachments')
    op.drop_table('complaint_attachments')
    op.drop_index(op.f('ix_vendor_ratings_vendor_id'), table_name='vendor_ratings')
    op.drop_index(op.f('ix_vendor_ratings_user_id'), table_name='vendor_ratings')
    op.drop_table('vendor_ratings')
    op.drop_index(op.f('ix_event_rsvps_user_id'), table_name='event_rsvps')
    op.drop_index(op.f('ix_event_rsvps_event_id'), table_name='event_rsvps')
    op.drop_table('event_rsvps')
    op.drop_index(op.f('ix_complaints_vendor_id'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_user_id'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_status'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_society_id'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_priority'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_deleted_at'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_complaint_number'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_category'), table_name='complaints')
    op.drop_table('complaints')
    op.drop_index(op.f('ix_vendors_society_id'), table_name='vendors')
    op.drop_index(op.f('ix_vendors_phone'), table_name='vendors')
    op.drop_index(op.f('ix_vendors_deleted_at'), table_name='vendors')
    op.drop_table('vendors')
    op.drop_index(op.f('ix_notices_society_id'), table_name='notices')
    op.drop_index(op.f('ix_notices_notice_type'), table_name='notices')
    op.drop_index(op.f('ix_notices_expires_at'), table_name='notices')
    op.drop_index(op.f('ix_notices_deleted_at'), table_name='notices')
    op.drop_table('notices')
    op.drop_index(op.f('ix_events_society_id'), table_name='events')
    op.drop_index(op.f('ix_events_deleted_at'), table_name='events')
    op.drop_table('events')
