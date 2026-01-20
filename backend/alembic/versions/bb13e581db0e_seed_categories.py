"""seed_categories

Revision ID: bb13e581db0e
Revises: 08cf2cb52227
Create Date: 2026-01-06 23:35:13.985977

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bb13e581db0e'
down_revision: Union[str, Sequence[str], None] = '08cf2cb52227'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    categories_table = sa.table('categories',
        sa.column('id', sa.Integer),
        sa.column('name', sa.String)
    )
    
    op.bulk_insert(categories_table,
        [
            {'name': 'Consulta / visita médica'},
            {'name': 'Recetas'},
            {'name': 'Laboratorio'},
            {'name': 'Vacunas'},
            {'name': 'Otro'},
        ]
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM categories WHERE name IN ('Consulta / visita médica', 'Recetas', 'Laboratorio', 'Vacunas', 'Otro')")
