"""add_flat_id_to_users

Revision ID: b7d7d4a2bc9c
Revises: 067dd28b623a
Create Date: 2026-07-06 15:23:55.700749

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b7d7d4a2bc9c'
down_revision: Union[str, Sequence[str], None] = '067dd28b623a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('flat_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_users_flat_id'), 'users', ['flat_id'], unique=False)
    op.create_foreign_key(None, 'users', 'flats', ['flat_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'users', type_='foreignkey')
    op.drop_index(op.f('ix_users_flat_id'), table_name='users')
    op.drop_column('users', 'flat_id')
