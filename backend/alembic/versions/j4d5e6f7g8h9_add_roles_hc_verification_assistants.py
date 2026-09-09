"""Add roles expansion, HC verification, assistant models

Revision ID: j4d5e6f7g8h9
Revises: v1a2b3c4d5e6
Create Date: 2025-01-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID


# revision identifiers, used by Alembic.
revision: str = 'j4d5e6f7g8h9'
down_revision: str = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ========================================
    # 1. Add ASSISTANT to userrole enum
    # ========================================
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ASSISTANT'")

    # ========================================
    # 2. Add ASSISTANT to recordsource enum
    # ========================================
    op.execute("ALTER TYPE recordsource ADD VALUE IF NOT EXISTS 'ASSISTANT'")

    # ========================================
    # 3. Create healthcenterverificationstatus enum
    # ========================================
    hc_status_enum = sa.Enum(
        'PENDING', 'VERIFIED', 'REJECTED',
        name='healthcenterverificationstatus',
    )
    hc_status_enum.create(op.get_bind(), checkfirst=True)

    # ========================================
    # 4. Add new columns to health_centers
    # ========================================
    op.add_column('health_centers', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('health_centers', sa.Column('website', sa.String(300), nullable=True))
    op.add_column('health_centers', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('health_centers', sa.Column('longitude', sa.Float(), nullable=True))
    op.add_column('health_centers', sa.Column('logo_key', sa.String(500), nullable=True))
    op.add_column('health_centers', sa.Column('tax_id', sa.String(100), nullable=True))
    op.add_column('health_centers', sa.Column(
        'verification_status',
        sa.Enum('PENDING', 'VERIFIED', 'REJECTED', name='healthcenterverificationstatus', create_type=False),
        server_default='PENDING',
        nullable=False,
    ))
    op.add_column('health_centers', sa.Column('verified_by', PGUUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('health_centers', sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('health_centers', sa.Column('rejection_reason', sa.Text(), nullable=True))
    op.add_column('health_centers', sa.Column('suggested_health_center_id', PGUUID(as_uuid=True), sa.ForeignKey('health_centers.id'), nullable=True))
    op.add_column('health_centers', sa.Column('created_by_id', PGUUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True))

    # ========================================
    # 5. Add health_center_id + assistant_id to medical_records
    # ========================================
    op.add_column('medical_records', sa.Column(
        'health_center_id', PGUUID(as_uuid=True),
        sa.ForeignKey('health_centers.id'), nullable=True,
    ))
    op.create_index('ix_medical_records_health_center_id', 'medical_records', ['health_center_id'])

    op.add_column('medical_records', sa.Column(
        'assistant_id', PGUUID(as_uuid=True),
        sa.ForeignKey('users.id'), nullable=True,
    ))

    # ========================================
    # 6. Add health_center_id to doctor_patient_access
    # ========================================
    op.add_column('doctor_patient_access', sa.Column(
        'health_center_id', PGUUID(as_uuid=True),
        sa.ForeignKey('health_centers.id'), nullable=True,
    ))
    op.create_index('ix_doctor_patient_access_health_center_id', 'doctor_patient_access', ['health_center_id'])

    # ========================================
    # 7. Create doctor_assistant_assignments table
    # ========================================
    op.create_table(
        'doctor_assistant_assignments',
        sa.Column('id', PGUUID(as_uuid=True), primary_key=True),
        sa.Column('doctor_id', PGUUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('assistant_id', PGUUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('health_center_id', PGUUID(as_uuid=True), sa.ForeignKey('health_centers.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('permissions', sa.ARRAY(sa.String()), nullable=False, server_default='{}'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deactivated_at', sa.DateTime(timezone=True), nullable=True),
    )

    # ========================================
    # 8. Create assistant_invitations table
    # ========================================
    op.create_table(
        'assistant_invitations',
        sa.Column('id', PGUUID(as_uuid=True), primary_key=True),
        sa.Column('doctor_id', PGUUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('health_center_id', PGUUID(as_uuid=True), sa.ForeignKey('health_centers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email', sa.String(200), nullable=False, index=True),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('permissions', sa.ARRAY(sa.String()), nullable=False, server_default='{}'),
        sa.Column('token', sa.String(128), unique=True, nullable=False, index=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('claimed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_revoked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('assistant_invitations')
    op.drop_table('doctor_assistant_assignments')

    op.drop_index('ix_doctor_patient_access_health_center_id', 'doctor_patient_access')
    op.drop_column('doctor_patient_access', 'health_center_id')

    op.drop_column('medical_records', 'assistant_id')
    op.drop_index('ix_medical_records_health_center_id', 'medical_records')
    op.drop_column('medical_records', 'health_center_id')

    op.drop_column('health_centers', 'created_by_id')
    op.drop_column('health_centers', 'suggested_health_center_id')
    op.drop_column('health_centers', 'rejection_reason')
    op.drop_column('health_centers', 'verified_at')
    op.drop_column('health_centers', 'verified_by')
    op.drop_column('health_centers', 'verification_status')
    op.drop_column('health_centers', 'tax_id')
    op.drop_column('health_centers', 'logo_key')
    op.drop_column('health_centers', 'longitude')
    op.drop_column('health_centers', 'latitude')
    op.drop_column('health_centers', 'website')
    op.drop_column('health_centers', 'description')

    sa.Enum(name='healthcenterverificationstatus').drop(op.get_bind(), checkfirst=True)

    # Note: Cannot remove enum values in PostgreSQL without recreating the type.
    # ASSISTANT values in userrole and recordsource will remain.
