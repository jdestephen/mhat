"""
Organization Models

Models for health centers, hospitals, clinics, and organizational structure.
"""
from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
import uuid
import enum

from sqlalchemy import (
    String, Boolean, Integer, Text, DateTime, Date, Float, ForeignKey, func, Enum
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class HealthCenterType(str, enum.Enum):
    """Types of health care facilities."""
    HOSPITAL = "HOSPITAL"
    CLINIC = "CLINIC"
    PRIVATE_PRACTICE = "PRIVATE_PRACTICE"
    LAB = "LAB"
    OTHER = "OTHER"


class HealthCenterRole(str, enum.Enum):
    """Roles within a health center organization."""
    OWNER = "OWNER"       # Can transfer ownership, delete organization
    ADMIN = "ADMIN"       # Can manage members, cannot delete organization
    DOCTOR = "DOCTOR"     # Affiliated doctor
    STAFF = "STAFF"       # Administrative staff (future use)


class HealthCenterVerificationStatus(str, enum.Enum):
    """Verification status for health centers created by doctors."""
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class HealthCenter(Base):
    """
    Represents a health care facility (hospital, clinic, private practice, etc).
    
    This is the organizational unit that doctors can be affiliated with,
    and that patients can share their records with.
    """
    __tablename__ = "health_centers"
    
    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Basic information
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    type: Mapped[HealthCenterType] = mapped_column(
        Enum(HealthCenterType),
        default=HealthCenterType.CLINIC,
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Contact information
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # Location (GPS)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Branding
    logo_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Legal / fiscal
    tax_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Verification workflow
    verification_status: Mapped[HealthCenterVerificationStatus] = mapped_column(
        Enum(HealthCenterVerificationStatus),
        default=HealthCenterVerificationStatus.PENDING,
        server_default="PENDING",
        nullable=False,
    )
    verified_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # When rejected as duplicate, the admin can suggest the correct HC
    suggested_health_center_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("health_centers.id"), nullable=True
    )

    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    created_by_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    
    # Relationships
    memberships: Mapped[List["HealthCenterMembership"]] = relationship(
        "HealthCenterMembership",
        back_populates="health_center",
        cascade="all, delete-orphan"
    )
    created_by: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[created_by_id]
    )
    verified_by_user: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[verified_by]
    )
    suggested_health_center: Mapped[Optional["HealthCenter"]] = relationship(
        "HealthCenter", remote_side=[id], foreign_keys=[suggested_health_center_id]
    )


class HealthCenterMembership(Base):
    """
    Junction table linking users (doctors, admins) to health centers.
    
    A doctor can be affiliated with multiple health centers,
    with different roles and specialties at each.
    """
    __tablename__ = "health_center_memberships"
    
    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Foreign keys
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    health_center_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("health_centers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Role within this organization
    role: Mapped[HealthCenterRole] = mapped_column(
        Enum(HealthCenterRole),
        default=HealthCenterRole.DOCTOR,
        nullable=False
    )
    
    # Specialty at this particular health center (per-affiliation)
    specialty: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    
    # Is this the doctor's primary workplace?
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Temporal tracking
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  # NULL = current member
    
    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    created_by_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="health_center_memberships"
    )
    health_center: Mapped["HealthCenter"] = relationship(
        "HealthCenter",
        back_populates="memberships"
    )
    created_by: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[created_by_id]
    )
