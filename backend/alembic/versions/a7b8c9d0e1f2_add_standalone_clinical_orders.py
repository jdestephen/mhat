"""add standalone clinical orders support

Revision ID: a7b8c9d0e1f2
Revises: v1a2b3c4d5e6
Create Date: 2026-07-27 01:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'v1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Make medical_record_id nullable
    op.alter_column(
        'clinical_orders',
        'medical_record_id',
        existing_type=sa.UUID(),
        nullable=True,
    )

    # 2. Add items JSONB column
    op.add_column(
        'clinical_orders',
        sa.Column('items', JSONB, nullable=True),
    )

    # 3. Add patient_id FK for standalone orders
    op.add_column(
        'clinical_orders',
        sa.Column('patient_id', sa.UUID(), nullable=True),
    )
    op.create_index(
        'ix_clinical_orders_patient_id',
        'clinical_orders',
        ['patient_id'],
    )
    op.create_foreign_key(
        'fk_clinical_orders_patient_id',
        'clinical_orders',
        'patient_profiles',
        ['patient_id'],
        ['id'],
    )

    # 4. Add category_id FK for standalone orders
    op.add_column(
        'clinical_orders',
        sa.Column('category_id', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'fk_clinical_orders_category_id',
        'clinical_orders',
        'categories',
        ['category_id'],
        ['id'],
    )

    # 5. Make description nullable (was required, now optional for record-attached orders)
    op.alter_column(
        'clinical_orders',
        'description',
        existing_type=sa.String(500),
        nullable=True,
    )

    # 6. Data migration: copy existing description into items[0] as legacy structured object
    op.execute("""
        UPDATE clinical_orders
        SET items = jsonb_build_array(jsonb_build_object('display', description))
        WHERE description IS NOT NULL
          AND description != ''
          AND items IS NULL
    """)

    # 7. Insert the "Orden" category
    op.execute("""
        INSERT INTO categories (id, name, has_diagnosis, documents, "order")
        VALUES (10, 'Orden', false, false, 10)
        ON CONFLICT (name) DO NOTHING
    """)
    op.execute("SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))")


def downgrade() -> None:
    # Remove "Orden" category
    op.execute("DELETE FROM categories WHERE name = 'Orden'")

    # Make description not nullable again
    op.execute("UPDATE clinical_orders SET description = '' WHERE description IS NULL")
    op.alter_column(
        'clinical_orders',
        'description',
        existing_type=sa.String(500),
        nullable=False,
    )

    # Drop category_id FK and column
    op.drop_constraint('fk_clinical_orders_category_id', 'clinical_orders', type_='foreignkey')
    op.drop_column('clinical_orders', 'category_id')

    # Drop patient_id FK, index, and column
    op.drop_constraint('fk_clinical_orders_patient_id', 'clinical_orders', type_='foreignkey')
    op.drop_index('ix_clinical_orders_patient_id', table_name='clinical_orders')
    op.drop_column('clinical_orders', 'patient_id')

    # Drop items column
    op.drop_column('clinical_orders', 'items')

    # Make medical_record_id not nullable again
    op.alter_column(
        'clinical_orders',
        'medical_record_id',
        existing_type=sa.UUID(),
        nullable=False,
    )
