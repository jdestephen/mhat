"""add pagination indexes

Revision ID: l6f7a8b9c0d1
Revises: k5e6f7a8b9c0
Create Date: 2026-11-18
"""

from typing import Sequence, Union

from alembic import op


revision: str = "l6f7a8b9c0d1"
down_revision: Union[str, Sequence[str], None] = "k5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INDEXES = (
    (
        "ix_medical_records_patient_date_page",
        "medical_records",
        ["patient_id", "record_date", "created_at", "id"],
    ),
    (
        "ix_vital_signs_patient_measured_page",
        "vital_signs",
        ["patient_id", "measured_at", "id"],
    ),
    (
        "ix_documents_record_created_page",
        "documents",
        ["medical_record_id", "created_at", "id"],
    ),
    (
        "ix_prescriptions_record_created_page",
        "prescriptions",
        ["medical_record_id", "created_at", "id"],
    ),
    (
        "ix_clinical_orders_patient_created_page",
        "clinical_orders",
        ["patient_id", "created_at", "id"],
    ),
    (
        "ix_clinical_orders_record_created_page",
        "clinical_orders",
        ["medical_record_id", "created_at", "id"],
    ),
    (
        "ix_share_tokens_patient_created_page",
        "share_tokens",
        ["patient_id", "created_at", "id"],
    ),
    (
        "ix_doctor_profiles_status_id_page",
        "doctor_profiles",
        ["approval_status", "id"],
    ),
    (
        "ix_assistant_assignments_doctor_active_page",
        "doctor_assistant_assignments",
        ["doctor_id", "is_active", "id"],
    ),
    (
        "ix_assistant_invitations_doctor_created_page",
        "assistant_invitations",
        ["doctor_id", "created_at", "id"],
    ),
)


def upgrade() -> None:
    for name, table, columns in INDEXES:
        op.create_index(name, table, columns, unique=False)


def downgrade() -> None:
    for name, table, _columns in reversed(INDEXES):
        op.drop_index(name, table_name=table)
