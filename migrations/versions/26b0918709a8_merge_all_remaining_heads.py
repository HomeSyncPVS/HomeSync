"""Merge all remaining heads

Revision ID: 26b0918709a8
Revises: 469a87185437, dd9c2528e8cb
Create Date: 2026-07-07 13:35:01.885180

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '26b0918709a8'
down_revision: Union[str, Sequence[str], None] = ('469a87185437', 'dd9c2528e8cb')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
