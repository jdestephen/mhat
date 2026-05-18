"""add receta category

Revision ID: f3b5d7e9a1c2
Revises: e2a4f6b8d0c1
Create Date: 2026-05-18 11:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f3b5d7e9a1c2'
down_revision = 'e2a4f6b8d0c1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO categories (id, name, has_diagnosis, documents, "order")
        VALUES (9, 'Receta', false, false, 9)
        ON CONFLICT (name) DO NOTHING
    """)
    # Reset sequence to max id to avoid future conflicts
    op.execute("SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))")


def downgrade() -> None:
    op.execute("DELETE FROM categories WHERE name = 'Receta'")
