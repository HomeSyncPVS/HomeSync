"""Merge multiple heads

Revision ID: 469a87185437
Revises: 44578497fb58, 9f21b43a7c10
Create Date: 2026-07-07 13:23:59.549050

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '469a87185437'
down_revision: Union[str, Sequence[str], None] = ('44578497fb58', '9f21b43a7c10')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
