"""Add per-doctor printing settings.

Revision ID: k5e6f7a8b9c0
Revises: j4d5e6f7g8h9
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID


revision = "k5e6f7a8b9c0"
down_revision = "j4d5e6f7g8h9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "doctor_print_settings",
        sa.Column("doctor_id", PGUUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("name_override", sa.String(200), nullable=True),
        sa.Column("degree_override", sa.String(200), nullable=True),
        sa.Column("clinic_name", sa.String(200), nullable=True),
        sa.Column("phone_1", sa.String(50), nullable=True),
        sa.Column("phone_2", sa.String(50), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("public_email", sa.String(200), nullable=True),
        sa.Column("logo_key", sa.String(500), nullable=True),
        sa.Column("logo_content_type", sa.String(30), nullable=True),
        sa.Column("show_duration", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("paper_size", sa.String(10), nullable=False, server_default="A4"),
    )


def downgrade() -> None:
    op.drop_table("doctor_print_settings")
