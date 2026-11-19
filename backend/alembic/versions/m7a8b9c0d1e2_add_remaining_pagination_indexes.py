"""add remaining pagination indexes

Revision ID: m7a8b9c0d1e2
Revises: l6f7a8b9c0d1
Create Date: 2026-11-18
"""

from typing import Sequence, Union

from alembic import op


revision: str = "m7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "l6f7a8b9c0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INDEXES = (
    (
        "ix_record_view_logs_record_viewed_page",
        "record_view_logs",
        ["medical_record_id", "viewed_at", "id"],
    ),
    (
        "ix_doctor_patient_access_doctor_created_page",
        "doctor_patient_access",
        ["doctor_id", "created_at", "id"],
    ),
)


def upgrade() -> None:
    for name, table, columns in INDEXES:
        op.create_index(name, table, columns, unique=False)


def downgrade() -> None:
    for name, table, _columns in reversed(INDEXES):
        op.drop_index(name, table_name=table)
