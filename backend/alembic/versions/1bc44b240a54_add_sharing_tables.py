"""Add sharing tables

Revision ID: 1bc44b240a54
Revises: aff3634c2965
Create Date: 2026-01-22 01:14:09.244305

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1bc44b240a54'
down_revision: Union[str, Sequence[str], None] = 'aff3634c2965'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create share_tokens table
    op.create_table('share_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expiration_minutes', sa.Integer(), nullable=False),
        sa.Column('is_revoked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_single_use', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('access_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('recipient_name', sa.String(), nullable=True),
        sa.Column('recipient_email', sa.String(), nullable=True),
        sa.Column('purpose', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['patient_id'], ['patient_profiles.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )
    op.create_index(op.f('ix_share_tokens_token'), 'share_tokens', ['token'], unique=True)
    
    # Create shared_records table
    op.create_table('shared_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('medical_record_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['medical_record_id'], ['medical_records.id'], ),
        sa.ForeignKeyConstraint(['token_id'], ['share_tokens.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create share_access_logs table
    op.create_table('share_access_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('accessed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('user_agent', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['token_id'], ['share_tokens.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('share_access_logs')
    op.drop_table('shared_records')
    op.drop_index(op.f('ix_share_tokens_token'), table_name='share_tokens')
    op.drop_table('share_tokens')
