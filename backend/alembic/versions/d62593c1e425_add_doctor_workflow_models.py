"""add_doctor_workflow_models

Revision ID: d62593c1e425
Revises: a9e82c2f88d8
Create Date: 2026-02-06 16:43:04.798569

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd62593c1e425'
down_revision: Union[str, Sequence[str], None] = 'a9e82c2f88d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Define enum types using PostgreSQL dialect
ordertype = postgresql.ENUM('LAB', 'IMAGING', 'REFERRAL', 'PROCEDURE', name='ordertype', create_type=False)
orderurgency = postgresql.ENUM('ROUTINE', 'URGENT', 'STAT', name='orderurgency', create_type=False)
accesslevel = postgresql.ENUM('READ_ONLY', 'WRITE', name='accesslevel', create_type=False)
recordsource = postgresql.ENUM('PATIENT', 'DOCTOR', 'IMPORTED', name='recordsource', create_type=False)


def upgrade() -> None:
    """Upgrade schema."""
    # Create enum types first using DO blocks (idempotent)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE ordertype AS ENUM ('LAB', 'IMAGING', 'REFERRAL', 'PROCEDURE');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE orderurgency AS ENUM ('ROUTINE', 'URGENT', 'STAT');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE accesslevel AS ENUM ('READ_ONLY', 'WRITE');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE recordsource AS ENUM ('PATIENT', 'DOCTOR', 'IMPORTED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create clinical_orders table
    op.create_table('clinical_orders',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('medical_record_id', sa.UUID(), nullable=False),
        sa.Column('order_type', ordertype, nullable=False),
        sa.Column('description', sa.String(length=500), nullable=False),
        sa.Column('urgency', orderurgency, nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('referral_to', sa.String(length=200), nullable=True),
        sa.Column('is_doctor_only', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['medical_record_id'], ['medical_records.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_clinical_orders_medical_record_id'), 'clinical_orders', ['medical_record_id'], unique=False)
    
    # Create prescriptions table
    op.create_table('prescriptions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('medical_record_id', sa.UUID(), nullable=False),
        sa.Column('medication_name', sa.String(length=200), nullable=False),
        sa.Column('dosage', sa.String(length=100), nullable=True),
        sa.Column('frequency', sa.String(length=100), nullable=True),
        sa.Column('duration', sa.String(length=100), nullable=True),
        sa.Column('route', sa.String(length=50), nullable=True),
        sa.Column('quantity', sa.String(length=50), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('is_doctor_only', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('linked_medication_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['linked_medication_id'], ['medications.id'], ),
        sa.ForeignKeyConstraint(['medical_record_id'], ['medical_records.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_prescriptions_medical_record_id'), 'prescriptions', ['medical_record_id'], unique=False)
    
    # Update doctor_patient_access table
    op.add_column('doctor_patient_access', sa.Column('patient_profile_id', sa.UUID(), nullable=True))
    op.add_column('doctor_patient_access', sa.Column('access_level', accesslevel, nullable=False, server_default='READ_ONLY'))
    op.add_column('doctor_patient_access', sa.Column('granted_by', sa.UUID(), nullable=True))
    op.alter_column('doctor_patient_access', 'patient_id',
               existing_type=sa.UUID(),
               nullable=True)
    op.create_index(op.f('ix_doctor_patient_access_doctor_id'), 'doctor_patient_access', ['doctor_id'], unique=False)
    op.create_index(op.f('ix_doctor_patient_access_patient_profile_id'), 'doctor_patient_access', ['patient_profile_id'], unique=False)
    op.create_foreign_key(None, 'doctor_patient_access', 'users', ['granted_by'], ['id'])
    op.create_foreign_key(None, 'doctor_patient_access', 'patient_profiles', ['patient_profile_id'], ['id'])
    
    # Add new columns to medical_records
    op.add_column('medical_records', sa.Column('record_source', recordsource, nullable=False, server_default='PATIENT'))
    op.add_column('medical_records', sa.Column('brief_history', sa.String(length=300), nullable=True))
    op.add_column('medical_records', sa.Column('has_red_flags', sa.Boolean(), nullable=True))
    op.add_column('medical_records', sa.Column('red_flags', sa.ARRAY(sa.String()), nullable=True))
    op.add_column('medical_records', sa.Column('key_finding', sa.String(length=250), nullable=True))
    op.add_column('medical_records', sa.Column('clinical_impression', sa.Text(), nullable=True))
    op.add_column('medical_records', sa.Column('actions_today', sa.ARRAY(sa.String()), nullable=True))
    op.add_column('medical_records', sa.Column('plan_bullets', sa.ARRAY(sa.String()), nullable=True))
    op.add_column('medical_records', sa.Column('follow_up_interval', sa.String(length=50), nullable=True))
    op.add_column('medical_records', sa.Column('follow_up_with', sa.String(length=200), nullable=True))
    op.add_column('medical_records', sa.Column('patient_instructions', sa.String(length=350), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Drop columns from medical_records
    op.drop_column('medical_records', 'patient_instructions')
    op.drop_column('medical_records', 'follow_up_with')
    op.drop_column('medical_records', 'follow_up_interval')
    op.drop_column('medical_records', 'plan_bullets')
    op.drop_column('medical_records', 'actions_today')
    op.drop_column('medical_records', 'clinical_impression')
    op.drop_column('medical_records', 'key_finding')
    op.drop_column('medical_records', 'red_flags')
    op.drop_column('medical_records', 'has_red_flags')
    op.drop_column('medical_records', 'brief_history')
    op.drop_column('medical_records', 'record_source')
    
    # Revert doctor_patient_access changes
    op.drop_constraint(None, 'doctor_patient_access', type_='foreignkey')
    op.drop_constraint(None, 'doctor_patient_access', type_='foreignkey')
    op.drop_index(op.f('ix_doctor_patient_access_patient_profile_id'), table_name='doctor_patient_access')
    op.drop_index(op.f('ix_doctor_patient_access_doctor_id'), table_name='doctor_patient_access')
    op.alter_column('doctor_patient_access', 'patient_id',
               existing_type=sa.UUID(),
               nullable=False)
    op.drop_column('doctor_patient_access', 'granted_by')
    op.drop_column('doctor_patient_access', 'access_level')
    op.drop_column('doctor_patient_access', 'patient_profile_id')
    
    # Drop tables
    op.drop_index(op.f('ix_prescriptions_medical_record_id'), table_name='prescriptions')
    op.drop_table('prescriptions')
    op.drop_index(op.f('ix_clinical_orders_medical_record_id'), table_name='clinical_orders')
    op.drop_table('clinical_orders')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS recordsource;')
    op.execute('DROP TYPE IF EXISTS accesslevel;')
    op.execute('DROP TYPE IF EXISTS orderurgency;')
    op.execute('DROP TYPE IF EXISTS ordertype;')
