"""Add documents column to categories

Revision ID: b7d2f3a1c5e9
Revises: 083385ec9c4b
Create Date: 2026-03-09 15:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7d2f3a1c5e9'
down_revision: Union[str, Sequence[str], None] = '083385ec9c4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add documents boolean column and seed document categories."""
    op.add_column('categories', sa.Column('documents', sa.Boolean(), nullable=True, server_default='false'))

    # Set documents=True for IDs 6, 7, 8 (Exámenes Complementarios, Estudio de Imágenes, Otros)
    op.execute("UPDATE categories SET documents = true WHERE id IN (6, 7, 8)")


def downgrade() -> None:
    """Remove documents column."""
    op.drop_column('categories', 'documents')
