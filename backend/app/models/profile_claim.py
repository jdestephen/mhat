"""
Profile Claim Request Model

Tracks requests from registered users to claim doctor-created patient profiles.
Requires doctor approval to link the profile to the user's account.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
import uuid
import enum

from sqlalchemy import String, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class ClaimStatus(str, enum.Enum):
    """Status of a profile claim request."""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ProfileClaimRequest(Base):
    """
    Request from a registered user to claim a doctor-created patient profile.

    Flow:
    1. Patient registers with email matching a standalone PatientProfile
    2. Patient requests to claim the profile → status=PENDING
    3. The doctor who created the profile approves/rejects
    4. If approved → PatientProfile.user_id is set to the requesting user
    """
    __tablename__ = "profile_claim_requests"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # The registered user requesting to claim the profile
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # The standalone profile to be claimed
    patient_profile_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[ClaimStatus] = mapped_column(
        Enum(ClaimStatus),
        default=ClaimStatus.PENDING,
        nullable=False,
    )

    # Timestamps
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Doctor who approved/rejected
    resolved_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
    )
    patient_profile: Mapped["PatientProfile"] = relationship(
        "PatientProfile",
    )
    resolver: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[resolved_by],
    )
