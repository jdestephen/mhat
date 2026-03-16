"""add_route_to_medications

Revision ID: fd1a3f099b1a
Revises: c958b9264804
Create Date: 2026-03-16 20:30:18.455254

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fd1a3f099b1a'
down_revision: Union[str, Sequence[str], None] = 'c958b9264804'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('medications', sa.Column('route', sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('medications', 'route')
