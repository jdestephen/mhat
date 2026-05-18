"""add record_date to medical_records

Revision ID: e2a4f6b8d0c1
Revises: c958b9264804
Create Date: 2026-05-18 09:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e2a4f6b8d0c1'
down_revision = 'd4e8f2a1b3c7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add record_date with server_default so existing rows get today's date initially
    op.add_column(
        'medical_records',
        sa.Column('record_date', sa.Date(), server_default=sa.func.current_date(), nullable=False)
    )

    # Backfill existing rows: set record_date = created_at::date
    op.execute("UPDATE medical_records SET record_date = created_at::date")


def downgrade() -> None:
    op.drop_column('medical_records', 'record_date')
