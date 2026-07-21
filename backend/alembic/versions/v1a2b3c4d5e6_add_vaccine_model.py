"""Add Vaccine model

Revision ID: v1a2b3c4d5e6
Revises: 5928a66f5bfb
Create Date: 2026-07-21 19:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'v1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = '5928a66f5bfb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('vaccines',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_profile_id', sa.UUID(), nullable=False),
    sa.Column('vaccine_name', sa.String(), nullable=False),
    sa.Column('code', sa.String(), nullable=True),
    sa.Column('code_system', sa.String(), nullable=True),
    sa.Column('dose_number', sa.Integer(), nullable=True),
    sa.Column('date_administered', sa.Date(), nullable=True),
    sa.Column('administered_by', sa.String(), nullable=True),
    sa.Column('lot_number', sa.String(length=50), nullable=True),
    sa.Column('site', sa.String(length=50), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('deleted', sa.Boolean(), nullable=False),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['patient_profile_id'], ['patient_profiles.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vaccines_id'), 'vaccines', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_vaccines_id'), table_name='vaccines')
    op.drop_table('vaccines')
