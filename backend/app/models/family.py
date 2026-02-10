"""
Family Account Models

Models for managing family relationships and access control.
Allows users to manage patient profiles for family members (children, elderly parents, etc.)
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
import uuid
import enum

from sqlalchemy import (
    String, Boolean, DateTime, ForeignKey, Enum, Index
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class RelationshipType(str, enum.Enum):
    """Defines the type of relationship between a user and a patient profile."""
    SELF = "SELF"              # User managing their own profile
    PARENT = "PARENT"          # Parent→Child
    CHILD = "CHILD"            # Child→Parent (elderly care)
    SPOUSE = "SPOUSE"          # Spouse→Spouse
    SIBLING = "SIBLING"        # Sibling→Sibling
    GRANDPARENT = "GRANDPARENT"
    GRANDCHILD = "GRANDCHILD"
    GUARDIAN = "GUARDIAN"      # Legal guardian (not parent)
    OTHER = "OTHER"


class AccessLevel(str, enum.Enum):
    """Defines the level of access a user has to a patient profile."""
    FULL_ACCESS = "FULL_ACCESS"      # Can view, create, edit all records
    READ_ONLY = "READ_ONLY"          # Can only view records
    EMERGENCY_ONLY = "EMERGENCY_ONLY"  # Only critical info (allergies, conditions)


class FamilyMembership(Base):
    """
    Grants a user access to manage a patient profile.
    Supports parent→child, child→parent, self-management relationships.
    
    Key features:
    - Multiple users can manage the same patient (e.g., both parents)
    - Access levels control what actions are permitted
    - Complete audit trail for access grants and revocations
    - Soft delete to maintain historical records
    """
    __tablename__ = "family_memberships"
    
    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Who has access (the manager/guardian)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    
    # Which patient they can access
    patient_profile_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    
    # Relationship type (parent, child, sibling, self, other)
    relationship_type: Mapped[RelationshipType] = mapped_column(
        Enum(RelationshipType),
        nullable=False
    )
    
    # Access level (full_access, read_only, emergency_only)
    access_level: Mapped[AccessLevel] = mapped_column(
        Enum(AccessLevel),
        default=AccessLevel.FULL_ACCESS,
        nullable=False
    )
    
    # Can this user add/remove other family members?
    can_manage_family: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    created_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )
    
    # Soft delete (for audit trail when access is revoked)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    revoked_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True
    )
    
    # Relationships
    manager: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="managed_patients"
    )
    patient_profile: Mapped["PatientProfile"] = relationship(
        "PatientProfile",
        back_populates="managed_by"
    )
    creator: Mapped["User"] = relationship(
        "User",
        foreign_keys=[created_by]
    )
    revoker: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[revoked_by]
    )
    
    # Unique constraint: one user can only have one active membership per patient
    __table_args__ = (
        Index(
            'ix_active_membership',
            'user_id',
            'patient_profile_id',
            unique=True,
            postgresql_where=(is_active == True)
        ),
    )
