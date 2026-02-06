"""
Access Invitation Model

Short-code invitations for patients to grant doctors access to their records.
"""
import secrets
import string
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, Integer, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base_class import Base
from app.models.user import AccessLevel, AccessType


def generate_invitation_code() -> str:
    """Generate a short, human-friendly code like 'MHAT-A7K9'."""
    chars = string.ascii_uppercase + string.digits
    # Remove ambiguous characters (0/O, 1/I/L)
    chars = chars.replace('0', '').replace('O', '').replace('1', '').replace('I', '').replace('L', '')
    suffix = ''.join(secrets.choice(chars) for _ in range(6))
    return f'MHAT-{suffix}'


class AccessInvitation(Base):
    """
    A short-lived invitation code that a patient creates
    so a registered doctor can claim access to their records.
    """
    __tablename__ = "access_invitations"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Who created this invitation
    patient_profile_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("patient_profiles.id"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # The invitation code (short, unique, indexed)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False, default=generate_invitation_code)

    # Access configuration
    access_level: Mapped[AccessLevel] = mapped_column(Enum(AccessLevel), default=AccessLevel.READ_ONLY, nullable=False)
    access_type: Mapped[AccessType] = mapped_column(Enum(AccessType), default=AccessType.PERMANENT, nullable=False)
    expires_in_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # For temporary access

    # Code expiration (the code itself expires, not the access)
    code_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Claim tracking
    claimed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    claimed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Audit
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
