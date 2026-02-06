"""add_health_center_organizational_structure

Revision ID: a9e82c2f88d8
Revises: eb9361c4e1dc
Create Date: 2026-02-06 15:24:10.603151

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a9e82c2f88d8'
down_revision: Union[str, Sequence[str], None] = 'eb9361c4e1dc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create health center organizational structure tables."""
    
    # Create health center type enum
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'healthcentertype') THEN
                CREATE TYPE healthcentertype AS ENUM ('HOSPITAL', 'CLINIC', 'PRIVATE_PRACTICE', 'LAB', 'OTHER');
            END IF;
        END
        $$;
    """)
    
    # Create health center role enum
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'healthcenterrole') THEN
                CREATE TYPE healthcenterrole AS ENUM ('OWNER', 'ADMIN', 'DOCTOR', 'STAFF');
            END IF;
        END
        $$;
    """)
    
    # Create health_centers table
    op.create_table(
        'health_centers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(200), nullable=False, index=True),
        sa.Column('type', postgresql.ENUM('HOSPITAL', 'CLINIC', 'PRIVATE_PRACTICE', 'LAB', 'OTHER', name='healthcentertype', create_type=False), nullable=False, server_default='CLINIC'),
        sa.Column('address', sa.String(500), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('country', sa.String(100), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    
    # Create health_center_memberships table
    op.create_table(
        'health_center_memberships',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('health_center_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('health_centers.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('role', postgresql.ENUM('OWNER', 'ADMIN', 'DOCTOR', 'STAFF', name='healthcenterrole', create_type=False), nullable=False, server_default='DOCTOR'),
        sa.Column('specialty', sa.String(200), nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
    )


def downgrade() -> None:
    """Remove health center organizational structure tables."""
    op.drop_table('health_center_memberships')
    op.drop_table('health_centers')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS healthcenterrole;')
    op.execute('DROP TYPE IF EXISTS healthcentertype;')
