"""Add vital_signs table

Revision ID: c8a3e5f1d7b2
Revises: b7d2f3a1c5e9
Create Date: 2026-03-11 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'c8a3e5f1d7b2'
down_revision: Union[str, Sequence[str], None] = 'b7d2f3a1c5e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create vital_signs table."""
    op.create_table(
        'vital_signs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('patient_id', UUID(as_uuid=True), sa.ForeignKey('patient_profiles.id'), nullable=False),
        sa.Column('medical_record_id', UUID(as_uuid=True), sa.ForeignKey('medical_records.id', ondelete='SET NULL'), nullable=True),
        # Vital signs
        sa.Column('heart_rate', sa.Integer, nullable=True),
        sa.Column('systolic_bp', sa.Integer, nullable=True),
        sa.Column('diastolic_bp', sa.Integer, nullable=True),
        sa.Column('temperature', sa.Float, nullable=True),
        sa.Column('respiratory_rate', sa.Integer, nullable=True),
        sa.Column('oxygen_saturation', sa.Integer, nullable=True),
        sa.Column('weight', sa.Float, nullable=True),
        sa.Column('height', sa.Float, nullable=True),
        sa.Column('blood_glucose', sa.Float, nullable=True),
        sa.Column('waist_circumference', sa.Float, nullable=True),
        # Meta
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('measured_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_vital_signs_patient_id', 'vital_signs', ['patient_id'])
    op.create_index('ix_vital_signs_medical_record_id', 'vital_signs', ['medical_record_id'])


def downgrade() -> None:
    """Drop vital_signs table."""
    op.drop_index('ix_vital_signs_medical_record_id', table_name='vital_signs')
    op.drop_index('ix_vital_signs_patient_id', table_name='vital_signs')
    op.drop_table('vital_signs')
