"""merge heads

Revision ID: 557a5fbffcb6
Revises: 44578497fb58, 662de9c9f4bc
Create Date: 2026-07-06 17:44:16.449372

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '557a5fbffcb6'
down_revision: Union[str, Sequence[str], None] = ('44578497fb58', '662de9c9f4bc')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
