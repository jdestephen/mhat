"""add_share_type_to_share_tokens

Revision ID: eb9361c4e1dc
Revises: a1fa027c64bb
Create Date: 2026-02-04 21:52:38.468996

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eb9361c4e1dc'
down_revision: Union[str, Sequence[str], None] = 'a1fa027c64bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create ShareType enum in PostgreSQL using idempotent pattern
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE sharetype AS ENUM ('SPECIFIC_RECORDS', 'SUMMARY');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Add share_type column to share_tokens table
    op.add_column('share_tokens', 
        sa.Column('share_type', sa.String(length=50), 
                  nullable=False, 
                  server_default='SPECIFIC_RECORDS')
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove share_type column
    op.drop_column('share_tokens', 'share_type')
    
    # Drop the enum type (only if no other tables use it)
    op.execute("DROP TYPE IF EXISTS sharetype")

