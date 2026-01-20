"""add_search_text_with_trigger

Revision ID: b7c8d9e0f1a2
Revises: 9af548ace5f4
Create Date: 2026-01-20 13:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, Sequence[str], None] = '9af548ace5f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add search_text column with trigger for auto-update."""
    
    # Add regular text column
    op.add_column('medical_records', sa.Column('search_text', sa.Text(), nullable=True))
    
    # Create function to update search_text
    op.execute("""
        CREATE OR REPLACE FUNCTION update_medical_record_search_text()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.search_text := LOWER(
                COALESCE(NEW.motive, '') || ' ' || 
                COALESCE(NEW.diagnosis, '') || ' ' || 
                COALESCE(NEW.notes, '') || ' ' ||
                ARRAY_TO_STRING(COALESCE(NEW.tags, ARRAY[]::text[]), ' ')
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
    """)
    
    # Create trigger
    op.execute("""
        CREATE TRIGGER medical_record_search_text_update
        BEFORE INSERT OR UPDATE ON medical_records
        FOR EACH ROW
        EXECUTE FUNCTION update_medical_record_search_text();
    """)
    
    # Update existing records
    op.execute("""
        UPDATE medical_records
        SET search_text = LOWER(
            COALESCE(motive, '') || ' ' || 
            COALESCE(diagnosis, '') || ' ' || 
            COALESCE(notes, '') || ' ' ||
            ARRAY_TO_STRING(COALESCE(tags, ARRAY[]::text[]), ' ')
        );
    """)
    
    # Create index for fast searching
    op.create_index('ix_medical_records_search_text', 'medical_records', ['search_text'])


def downgrade() -> None:
    """Remove search_text column, trigger, and function."""
    op.drop_index('ix_medical_records_search_text', table_name='medical_records')
    op.execute("DROP TRIGGER IF EXISTS medical_record_search_text_update ON medical_records")
    op.execute("DROP FUNCTION IF EXISTS update_medical_record_search_text()")
    op.drop_column('medical_records', 'search_text')
