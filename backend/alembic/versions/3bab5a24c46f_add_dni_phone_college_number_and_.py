"""Add dni phone college_number and personal_references

Revision ID: 3bab5a24c46f
Revises: f446816df8ed
Create Date: 2026-03-04 18:45:38.068094

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '3bab5a24c46f'
down_revision: Union[str, Sequence[str], None] = 'f446816df8ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Define the enum type for reuse
relationshiptype_enum = postgresql.ENUM(
    'PADRE', 'MADRE', 'HERMANO_A', 'ESPOSO_A', 'HIJO_A',
    'TIO_A', 'ABUELO_A', 'AMIGO_A', 'GUARDIAN', 'OTRO',
    name='relationshiptype', create_type=False
)


def upgrade() -> None:
    """Upgrade schema."""
    # Create the enum type idempotently (may already exist from a failed run)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationshiptype') THEN
                CREATE TYPE relationshiptype AS ENUM (
                    'PADRE', 'MADRE', 'HERMANO_A', 'ESPOSO_A', 'HIJO_A',
                    'TIO_A', 'ABUELO_A', 'AMIGO_A', 'GUARDIAN', 'OTRO'
                );
            END IF;
        END $$;
    """)

    op.create_table('personal_references',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_profile_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('phone', sa.String(), nullable=False),
    sa.Column('relationship_type', relationshiptype_enum, nullable=False),
    sa.ForeignKeyConstraint(['patient_profile_id'], ['patient_profiles.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_personal_references_id'), 'personal_references', ['id'], unique=False)
    op.add_column('doctor_profiles', sa.Column('dni', sa.String(), nullable=True))
    op.add_column('doctor_profiles', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('doctor_profiles', sa.Column('college_number', sa.String(), nullable=True))
    op.add_column('patient_profiles', sa.Column('dni', sa.String(), nullable=True))
    op.add_column('patient_profiles', sa.Column('phone', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('patient_profiles', 'phone')
    op.drop_column('patient_profiles', 'dni')
    op.drop_column('doctor_profiles', 'college_number')
    op.drop_column('doctor_profiles', 'phone')
    op.drop_column('doctor_profiles', 'dni')
    op.drop_index(op.f('ix_personal_references_id'), table_name='personal_references')
    op.drop_table('personal_references')
    sa.Enum(name='relationshiptype').drop(op.get_bind(), checkfirst=True)

