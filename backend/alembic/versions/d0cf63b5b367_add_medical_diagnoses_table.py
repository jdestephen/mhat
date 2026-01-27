"""add medical diagnoses table

Revision ID: d0cf63b5b367
Revises: b5eb77ef0b1d
Create Date: 2026-01-27 19:58:07.965405

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd0cf63b5b367'
down_revision: Union[str, Sequence[str], None] = 'b5eb77ef0b1d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    
    # 1. Create DiagnosisStatus enum using raw SQL to control checkfirst behavior
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE diagnosisstatus AS ENUM ('CONFIRMED', 'PROVISIONAL', 'DIFFERENTIAL', 'REFUTED', 'ENTERED_IN_ERROR');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # 2. Create medical_diagnoses table using raw SQL to avoid enum re-creation
    op.execute("""
        CREATE TABLE medical_diagnoses (
            id UUID PRIMARY KEY,
            medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
            diagnosis VARCHAR NOT NULL,
            diagnosis_code VARCHAR,
            diagnosis_code_system VARCHAR,
            rank INTEGER NOT NULL DEFAULT 1,
            status diagnosisstatus NOT NULL DEFAULT 'PROVISIONAL',
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            created_by UUID NOT NULL REFERENCES users(id)
        );
    """)
    
    # Add indexes
    op.create_index('ix_medical_diagnoses_medical_record_id', 'medical_diagnoses', ['medical_record_id'])
    op.create_index('ix_medical_diagnoses_diagnosis_code', 'medical_diagnoses', ['diagnosis_code'])
    
    # 3. Migrate existing diagnosis data from medical_records to medical_diagnoses
    op.execute("""
        INSERT INTO medical_diagnoses (id, medical_record_id, diagnosis, diagnosis_code, diagnosis_code_system, rank, status, created_at, created_by)
        SELECT 
            gen_random_uuid(),
            id as medical_record_id,
            diagnosis,
            diagnosis_code,
            diagnosis_code_system,
            1 as rank,
            'CONFIRMED'::diagnosisstatus as status,
            created_at,
            created_by
        FROM medical_records
        WHERE diagnosis IS NOT NULL AND diagnosis != '';
    """)
    
    # 4. Drop old diagnosis columns from medical_records
    op.drop_column('medical_records', 'diagnosis')
    op.drop_column('medical_records', 'diagnosis_code')
    op.drop_column('medical_records', 'diagnosis_code_system')


def downgrade() -> None:
    """Downgrade schema."""
    
    # 1. Add diagnosis columns back to medical_records
    op.add_column('medical_records', sa.Column('diagnosis', sa.String(), nullable=True))
    op.add_column('medical_records', sa.Column('diagnosis_code', sa.String(), nullable=True))
    op.add_column('medical_records', sa.Column('diagnosis_code_system', sa.String(), nullable=True))
    
    # 2. Migrate primary diagnosis back to medical_records
    op.execute("""
        UPDATE medical_records mr
        SET 
            diagnosis = md.diagnosis,
            diagnosis_code = md.diagnosis_code,
            diagnosis_code_system = md.diagnosis_code_system
        FROM medical_diagnoses md
        WHERE mr.id = md.medical_record_id
        AND md.rank = 1;
    """)
    
    # 3. Drop medical_diagnoses table
    op.drop_index('ix_medical_diagnoses_diagnosis_code', 'medical_diagnoses')
    op.drop_index('ix_medical_diagnoses_medical_record_id', 'medical_diagnoses')
    op.drop_table('medical_diagnoses')
    
    # 4. Drop DiagnosisStatus enum
    op.execute("DROP TYPE diagnosisstatus;")
