"""make code and code_system nullable for allergies and conditions

Revision ID: a7f1b2c3d4e5
Revises: 648ad44c466b
Create Date: 2026-04-23 20:48:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a7f1b2c3d4e5'
down_revision = '648ad44c466b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Allergies: make code and code_system nullable for custom entries
    op.alter_column('allergies', 'code',
                     existing_type=sa.String(),
                     nullable=True)
    op.alter_column('allergies', 'code_system',
                     existing_type=sa.String(),
                     nullable=True)

    # Conditions: make code and code_system nullable for custom entries
    op.alter_column('conditions', 'code',
                     existing_type=sa.String(),
                     nullable=True)
    op.alter_column('conditions', 'code_system',
                     existing_type=sa.String(),
                     nullable=True)


def downgrade() -> None:
    # Revert: set columns back to NOT NULL
    # NOTE: This will fail if there are rows with NULL values
    op.alter_column('conditions', 'code_system',
                     existing_type=sa.String(),
                     nullable=False)
    op.alter_column('conditions', 'code',
                     existing_type=sa.String(),
                     nullable=False)
    op.alter_column('allergies', 'code_system',
                     existing_type=sa.String(),
                     nullable=False)
    op.alter_column('allergies', 'code',
                     existing_type=sa.String(),
                     nullable=False)
