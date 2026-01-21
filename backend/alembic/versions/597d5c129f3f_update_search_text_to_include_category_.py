"""update_search_text_to_include_category_and_status

Revision ID: 597d5c129f3f
Revises: b7c8d9e0f1a2
Create Date: 2026-01-21 12:21:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '597d5c129f3f'
down_revision: Union[str, Sequence[str], None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update search_text trigger to include category name and status."""
    
    # Drop existing trigger
    op.execute("DROP TRIGGER IF EXISTS medical_record_search_text_update ON medical_records")
    
    # Update function to include category and status
    # Note: We need to join with categories table to get the name
    op.execute("""
        CREATE OR REPLACE FUNCTION update_medical_record_search_text()
        RETURNS TRIGGER AS $$
        DECLARE
            category_name TEXT;
            status_text TEXT;
        BEGIN
            -- Get category name if exists
            IF NEW.category_id IS NOT NULL THEN
                SELECT name INTO category_name FROM categories WHERE id = NEW.category_id;
            ELSE
                category_name := '';
            END IF;
            
            -- Convert status enum to text and replace underscores with spaces
            status_text := REPLACE(NEW.status::text, '_', ' ');
            
            -- Concatenate all searchable fields
            NEW.search_text := LOWER(
                COALESCE(NEW.motive, '') || ' ' || 
                COALESCE(NEW.diagnosis, '') || ' ' || 
                COALESCE(NEW.notes, '') || ' ' ||
                COALESCE(category_name, '') || ' ' ||
                COALESCE(status_text, '') || ' ' ||
                ARRAY_TO_STRING(COALESCE(NEW.tags, ARRAY[]::text[]), ' ')
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    # Recreate trigger
    op.execute("""
        CREATE TRIGGER medical_record_search_text_update
        BEFORE INSERT OR UPDATE ON medical_records
        FOR EACH ROW
        EXECUTE FUNCTION update_medical_record_search_text();
    """)
    
    # Update existing records with new search text
    op.execute("""
        UPDATE medical_records mr
        SET search_text = LOWER(
            COALESCE(mr.motive, '') || ' ' || 
            COALESCE(mr.diagnosis, '') || ' ' || 
            COALESCE(mr.notes, '') || ' ' ||
            COALESCE(c.name, '') || ' ' ||
            REPLACE(mr.status::text, '_', ' ') || ' ' ||
            ARRAY_TO_STRING(COALESCE(mr.tags, ARRAY[]::text[]), ' ')
        )
        FROM (SELECT id, name FROM categories) c
        WHERE mr.category_id = c.id OR mr.category_id IS NULL;
    """)


def downgrade() -> None:
    """Revert to previous search_text trigger."""
    
    # Drop updated trigger
    op.execute("DROP TRIGGER IF EXISTS medical_record_search_text_update ON medical_records")
    
    # Restore original function (without category and status)
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
    
    # Recreate original trigger
    op.execute("""
        CREATE TRIGGER medical_record_search_text_update
        BEFORE INSERT OR UPDATE ON medical_records
        FOR EACH ROW
        EXECUTE FUNCTION update_medical_record_search_text();
    """)
    
    # Update existing records back to original search text
    op.execute("""
        UPDATE medical_records
        SET search_text = LOWER(
            COALESCE(motive, '') || ' ' || 
            COALESCE(diagnosis, '') || ' ' || 
            COALESCE(notes, '') || ' ' ||
            ARRAY_TO_STRING(COALESCE(tags, ARRAY[]::text[]), ' ')
        );
    """)
