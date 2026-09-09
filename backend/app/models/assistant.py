"""
Assistant Models

Models for doctor-assistant relationships, permissions, and invitations.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
import uuid
import enum

from sqlalchemy import (
    String, Boolean, Text, DateTime, ForeignKey, func, Enum, ARRAY
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class AssistantPermission(str, enum.Enum):
    """Granular permissions for assistant access to patient data.

    RECORDS_READ/WRITE imply access to prescriptions, orders, and documents.
    """
    PATIENT_INFO_READ = "PATIENT_INFO_READ"
    PATIENT_INFO_WRITE = "PATIENT_INFO_WRITE"
    HEALTH_HISTORY_READ = "HEALTH_HISTORY_READ"
    HEALTH_HISTORY_WRITE = "HEALTH_HISTORY_WRITE"
    VITAL_SIGNS_READ = "VITAL_SIGNS_READ"
    VITAL_SIGNS_WRITE = "VITAL_SIGNS_WRITE"
    RECORDS_READ = "RECORDS_READ"
    RECORDS_WRITE = "RECORDS_WRITE"
    DOCUMENTS_READ = "DOCUMENTS_READ"
    DOCUMENTS_WRITE = "DOCUMENTS_WRITE"


class DoctorAssistantAssignment(Base):
    """
    Links a doctor to an assistant at a specific health center with granular permissions.

    An assistant can be assigned to multiple doctors — each doctor defines
    independent permissions for the same assistant.
    """
    __tablename__ = "doctor_assistant_assignments"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    doctor_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    assistant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    health_center_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("health_centers.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    # Permissions stored as an array of AssistantPermission values
    permissions: Mapped[List[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )

    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    deactivated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    doctor: Mapped["User"] = relationship(
        "User", foreign_keys=[doctor_id]
    )
    assistant: Mapped["User"] = relationship(
        "User", foreign_keys=[assistant_id]
    )
    health_center: Mapped["HealthCenter"] = relationship("HealthCenter")


class AssistantInvitation(Base):
    """
    Invitation sent by a doctor to create an assistant account.

    Follows the existing invitation pattern (AccessInvitation, FamilyInvitation):
    doctor creates invitation → email with activation link → assistant creates
    account and sets password → auto-linked to doctor + HC with pre-defined permissions.
    """
    __tablename__ = "assistant_invitations"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Who is inviting
    doctor_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    # Health center where the assistant will work
    health_center_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("health_centers.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Invitee information
    email: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Pre-defined permissions for when the invitation is claimed
    permissions: Mapped[List[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list
    )

    # Activation token
    token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)

    # Lifecycle
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    claimed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_revoked: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    doctor: Mapped["User"] = relationship("User", foreign_keys=[doctor_id])
    health_center: Mapped["HealthCenter"] = relationship("HealthCenter")
