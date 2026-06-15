"""Add doctor verification document columns

Revision ID: h2b3c4d5e6f7
Revises: g1a2b3c4d5e6
Create Date: 2026-06-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "h2b3c4d5e6f7"
down_revision = "g1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("doctor_profiles", sa.Column("identity_document_key", sa.String(), nullable=True))
    op.add_column("doctor_profiles", sa.Column("college_document_key", sa.String(), nullable=True))
    op.add_column("doctor_profiles", sa.Column("ocr_extracted_data", postgresql.JSONB(), nullable=True))
    op.add_column("doctor_profiles", sa.Column("verification_notes", sa.Text(), nullable=True))
    op.add_column("doctor_profiles", sa.Column("ocr_processed", sa.Boolean(), server_default="false", nullable=False))


def downgrade() -> None:
    op.drop_column("doctor_profiles", "ocr_processed")
    op.drop_column("doctor_profiles", "verification_notes")
    op.drop_column("doctor_profiles", "ocr_extracted_data")
    op.drop_column("doctor_profiles", "college_document_key")
    op.drop_column("doctor_profiles", "identity_document_key")
