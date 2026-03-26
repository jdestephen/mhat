"""Fix personal reference enum name collision

Revision ID: a19bbc68568c
Revises: 3bab5a24c46f
Create Date: 2026-03-04 20:17:54.923014

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a19bbc68568c'
down_revision: Union[str, Sequence[str], None] = '3bab5a24c46f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix: personal_references was wrongly using the FamilyMembership 'relationshiptype' enum.
    Create a new 'personalreferencetype' enum with Spanish values and migrate the column."""

    # 1. Create the new enum type idempotently
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'personalreferencetype') THEN
                CREATE TYPE personalreferencetype AS ENUM (
                    'PADRE', 'MADRE', 'HERMANO_A', 'ESPOSO_A', 'HIJO_A',
                    'TIO_A', 'ABUELO_A', 'AMIGO_A', 'GUARDIAN', 'OTRO'
                );
            END IF;
        END $$;
    """)

    # 2. Drop the column (it has no valid data since inserts were failing)
    op.drop_column('personal_references', 'relationship_type')

    # 3. Re-add the column with the correct enum type
    personalreferencetype_enum = postgresql.ENUM(
        'PADRE', 'MADRE', 'HERMANO_A', 'ESPOSO_A', 'HIJO_A',
        'TIO_A', 'ABUELO_A', 'AMIGO_A', 'GUARDIAN', 'OTRO',
        name='personalreferencetype', create_type=False
    )
    op.add_column('personal_references', sa.Column(
        'relationship_type', personalreferencetype_enum, nullable=False,
        server_default='OTRO'
    ))
    # Remove the server_default after adding the column
    op.alter_column('personal_references', 'relationship_type', server_default=None)


def downgrade() -> None:
    """Revert to using the old relationshiptype enum."""
    op.drop_column('personal_references', 'relationship_type')
    op.add_column('personal_references', sa.Column(
        'relationship_type',
        postgresql.ENUM('SELF', 'PARENT', 'CHILD', 'SPOUSE', 'SIBLING',
                       'GRANDPARENT', 'GRANDCHILD', 'GUARDIAN', 'OTHER',
                       name='relationshiptype', create_type=False),
        nullable=False,
        server_default='OTHER'
    ))
    op.alter_column('personal_references', 'relationship_type', server_default=None)
    sa.Enum(name='personalreferencetype').drop(op.get_bind(), checkfirst=True)
