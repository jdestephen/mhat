"""Add family accounts

Revision ID: 2f3c4d5e6f7a
Revises: 1bc44b240a54
Create Date: 2026-01-27 07:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2f3c4d5e6f7a'
down_revision: Union[str, Sequence[str], None] = '1bc44b240a54'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for family accounts."""
    
    # Step 1: Add first_name and last_name to patient_profiles
    op.add_column('patient_profiles', 
        sa.Column('first_name', sa.String(), nullable=True))
    op.add_column('patient_profiles', 
        sa.Column('last_name', sa.String(), nullable=True))
    
    # Step 2: Copy first_name and last_name from users to patient_profiles
    # This preserves existing data before we make user_id nullable
    op.execute("""
        UPDATE patient_profiles pp
        SET first_name = u.first_name,
            last_name = u.last_name
        FROM users u
        WHERE pp.user_id = u.id
    """)
    
    # Step 3: Drop unique constraint on user_id
    # Note: Constraint name may vary, check your DB if this fails
    op.drop_constraint('patient_profiles_user_id_key', 'patient_profiles', type_='unique')
    
    # Step 4: Make user_id nullable
    op.alter_column('patient_profiles', 'user_id',
                    existing_type=postgresql.UUID(),
                    nullable=True)
    
    # Step 5: Create family_memberships table
    op.create_table('family_memberships',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('patient_profile_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('relationship_type', sa.Enum(
            'SELF', 'PARENT', 'CHILD', 'SPOUSE', 'SIBLING', 
            'GRANDPARENT', 'GRANDCHILD', 'GUARDIAN', 'OTHER',
            name='relationshiptype'
        ), nullable=False),
        sa.Column('access_level', sa.Enum(
            'FULL_ACCESS', 'READ_ONLY', 'EMERGENCY_ONLY',
            name='accesslevel'
        ), nullable=False, server_default='FULL_ACCESS'),
        sa.Column('can_manage_family', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['patient_profile_id'], ['patient_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['revoked_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_family_memberships_user_id'), 'family_memberships', ['user_id'], unique=False)
    op.create_index(op.f('ix_family_memberships_patient_profile_id'), 'family_memberships', ['patient_profile_id'], unique=False)
    
    # Create partial unique index for active memberships
    op.create_index(
        'ix_active_membership',
        'family_memberships',
        ['user_id', 'patient_profile_id'],
        unique=True,
        postgresql_where=sa.text('is_active = true')
    )
    
    # Step 6: Create self-referential family memberships for existing users
    # This ensures all existing users can still access their own patient profile
    op.execute("""
        INSERT INTO family_memberships (
            id, user_id, patient_profile_id, relationship_type, 
            access_level, can_manage_family, created_by, is_active
        )
        SELECT 
            gen_random_uuid(),
            pp.user_id,
            pp.id,
            'SELF',
            'FULL_ACCESS',
            true,
            pp.user_id,
            true
        FROM patient_profiles pp
        WHERE pp.user_id IS NOT NULL
    """)


def downgrade() -> None:
    """Downgrade schema - remove family accounts."""
    
    # Drop family_memberships table and related objects
    op.drop_index('ix_active_membership', table_name='family_memberships')
    op.drop_index(op.f('ix_family_memberships_patient_profile_id'), table_name='family_memberships')
    op.drop_index(op.f('ix_family_memberships_user_id'), table_name='family_memberships')
    op.drop_table('family_memberships')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS accesslevel')
    op.execute('DROP TYPE IF EXISTS relationshiptype')
    
    # Restore user_id as non-nullable
    # Note: This will fail if there are patient profiles without users
    op.alter_column('patient_profiles', 'user_id',
                    existing_type=postgresql.UUID(),
                    nullable=False)
    
    # Restore unique constraint on user_id
    op.create_unique_constraint('patient_profiles_user_id_key', 'patient_profiles', ['user_id'])
    
    # Drop added columns
    op.drop_column('patient_profiles', 'last_name')
    op.drop_column('patient_profiles', 'first_name')
