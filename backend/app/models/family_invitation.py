"""
Family Invitation Model

Short-code invitation system for granting family members
access to patient profiles (separate from doctor AccessInvitation).
"""
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional
from uuid import UUID
import uuid
import secrets
import string
from datetime import datetime

from app.db.base_class import Base
from app.models.family import RelationshipType, AccessLevel


def _generate_family_code() -> str:
    """Generate a short, human-friendly code like 'FAM-A7K9'."""
    chars = string.ascii_uppercase + string.digits
    # Remove ambiguous chars (0/O, 1/I/L)
    chars = chars.replace('0', '').replace('O', '').replace('1', '').replace('I', '').replace('L', '')
    suffix = ''.join(secrets.choice(chars) for _ in range(4))
    return f"FAM-{suffix}"


class FamilyInvitation(Base):
    __tablename__ = "family_invitations"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Who created the invitation
    creator_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Which patient profile to share
    patient_profile_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("patient_profiles.id"), nullable=False
    )

    # Short code
    code: Mapped[str] = mapped_column(
        String(10), unique=True, nullable=False, default=_generate_family_code
    )

    # What relationship the claimer will have
    relationship_type: Mapped[RelationshipType] = mapped_column(
        Enum(RelationshipType, name="familyrelationshiptype", create_type=False),
        nullable=False,
    )

    # Access config
    access_level: Mapped[AccessLevel] = mapped_column(
        Enum(AccessLevel, name="familyaccesslevel", create_type=False),
        default=AccessLevel.FULL_ACCESS,
        nullable=False,
    )
    can_manage_family: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Lifecycle
    code_expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    claimed_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    claimed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    creator: Mapped["User"] = relationship("User", foreign_keys=[creator_id])
    patient_profile: Mapped["PatientProfile"] = relationship("PatientProfile")
    claimer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[claimed_by])
