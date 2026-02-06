"""add_access_invitations_table

Revision ID: cd80d39bc593
Revises: d62593c1e425
Create Date: 2026-02-06 22:44:51.573497

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'cd80d39bc593'
down_revision: Union[str, Sequence[str], None] = 'd62593c1e425'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Reuse existing enums
accesslevel_enum = postgresql.ENUM('READ_ONLY', 'WRITE', name='accesslevel', create_type=False)


def upgrade() -> None:
    """Create access_invitations table."""
    # Create accesstype enum idempotently (accesslevel already exists)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE accesstype AS ENUM ('PERMANENT', 'TEMPORARY');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    accesstype_enum = postgresql.ENUM('PERMANENT', 'TEMPORARY', name='accesstype', create_type=False)

    op.create_table('access_invitations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('patient_profile_id', sa.UUID(), nullable=False),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('access_level', accesslevel_enum, nullable=False),
        sa.Column('access_type', accesstype_enum, nullable=False),
        sa.Column('expires_in_days', sa.Integer(), nullable=True),
        sa.Column('code_expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('claimed_by', sa.UUID(), nullable=True),
        sa.Column('claimed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_revoked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['claimed_by'], ['users.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['patient_profile_id'], ['patient_profiles.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_access_invitations_code'), 'access_invitations', ['code'], unique=True)
    op.create_index(op.f('ix_access_invitations_patient_profile_id'), 'access_invitations', ['patient_profile_id'], unique=False)


def downgrade() -> None:
    """Drop access_invitations table."""
    op.drop_index(op.f('ix_access_invitations_patient_profile_id'), table_name='access_invitations')
    op.drop_index(op.f('ix_access_invitations_code'), table_name='access_invitations')
    op.drop_table('access_invitations')
