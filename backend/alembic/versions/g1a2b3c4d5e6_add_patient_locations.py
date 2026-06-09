"""Add patient_locations table

Revision ID: g1a2b3c4d5e6
Revises: fa2e9ace06c7
Create Date: 2026-06-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "g1a2b3c4d5e6"
down_revision = "52268740320e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "patient_locations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "patient_profile_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("patient_profiles.id"),
            nullable=False,
        ),
        sa.Column("label", sa.String(100), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_patient_locations_profile_id",
        "patient_locations",
        ["patient_profile_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_patient_locations_profile_id", table_name="patient_locations")
    op.drop_table("patient_locations")
