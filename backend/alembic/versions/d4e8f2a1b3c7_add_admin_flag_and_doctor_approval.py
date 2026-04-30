"""add admin flag and doctor approval workflow

Revision ID: d4e8f2a1b3c7
Revises: a7f1b2c3d4e5
Create Date: 2026-04-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e8f2a1b3c7'
down_revision: Union[str, Sequence[str], None] = 'a7f1b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type first
    doctorapprovalstatus = sa.Enum('PENDING', 'APPROVED', 'REJECTED', name='doctorapprovalstatus')
    doctorapprovalstatus.create(op.get_bind(), checkfirst=True)

    # Add is_admin to users
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), server_default='false', nullable=False))

    # Add doctor approval fields
    op.add_column('doctor_profiles', sa.Column('verification_phone', sa.String(), nullable=True))
    op.add_column('doctor_profiles', sa.Column(
        'approval_status',
        sa.Enum('PENDING', 'APPROVED', 'REJECTED', name='doctorapprovalstatus', create_type=False),
        server_default='PENDING',
        nullable=False,
    ))
    op.add_column('doctor_profiles', sa.Column('approved_by', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('doctor_profiles', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('doctor_profiles', sa.Column('rejection_reason', sa.String(), nullable=True))

    # Add foreign key for approved_by
    op.create_foreign_key(
        'fk_doctor_profiles_approved_by',
        'doctor_profiles', 'users',
        ['approved_by'], ['id'],
    )

    # Set all existing doctors to APPROVED so they aren't locked out
    op.execute("UPDATE doctor_profiles SET approval_status = 'APPROVED'")


def downgrade() -> None:
    op.drop_constraint('fk_doctor_profiles_approved_by', 'doctor_profiles', type_='foreignkey')
    op.drop_column('doctor_profiles', 'rejection_reason')
    op.drop_column('doctor_profiles', 'approved_at')
    op.drop_column('doctor_profiles', 'approved_by')
    op.drop_column('doctor_profiles', 'approval_status')
    op.drop_column('doctor_profiles', 'verification_phone')
    op.drop_column('users', 'is_admin')

    # Drop enum
    sa.Enum(name='doctorapprovalstatus').drop(op.get_bind(), checkfirst=True)
