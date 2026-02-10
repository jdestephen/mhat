from datetime import datetime
import enum
from typing import Optional, List
from uuid import UUID
import uuid

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.sql import func

from app.db.base_class import Base

class UserRole(str, enum.Enum):
    DOCTOR = "DOCTOR"
    PATIENT = "PATIENT"

class Sex(str, enum.Enum):
    MASCULINO = "MASCULINO"
    FEMININO = "FEMENINO"

class AccessType(str, enum.Enum):
    PERMANENT = "PERMANENT"
    TEMPORARY = "TEMPORARY"

class DoctorAccessLevel(str, enum.Enum):
    """Level of access a doctor has to a patient's records."""
    READ_ONLY = "READ_ONLY"       # Doctor can view records
    WRITE = "WRITE"               # Doctor can create/verify records

class DoctorPatientAccess(Base):
    """
    Tracks which doctors have access to which patients.
    
    A doctor can have access to:
    - Patients with user accounts (via patient_id -> users.id for backward compat)
    - Patients without user accounts (via patient_profile_id)
    """
    __tablename__ = "doctor_patient_access"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Legacy field - kept for backward compatibility
    patient_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # New field - supports non-user patients
    patient_profile_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("patient_profiles.id"), nullable=True, index=True)
    
    access_type: Mapped[AccessType] = mapped_column(Enum(AccessType), default=AccessType.PERMANENT)
    access_level: Mapped[DoctorAccessLevel] = mapped_column(Enum(DoctorAccessLevel, name='doctoraccesslevel', create_type=True), default=DoctorAccessLevel.READ_ONLY)
    
    # Audit
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    granted_by: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.PATIENT, nullable=False)
    
    first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sex: Mapped[Optional[Sex]] = mapped_column(Enum(Sex), nullable=True)
    
    city: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    patient_profile: Mapped[Optional["PatientProfile"]] = relationship("PatientProfile", back_populates="user", uselist=False)
    doctor_profile: Mapped[Optional["DoctorProfile"]] = relationship("DoctorProfile", back_populates="user", uselist=False)
    # Patient profiles this user can manage (family members)
    managed_patients: Mapped[List["FamilyMembership"]] = relationship(
        "FamilyMembership",
        foreign_keys="[FamilyMembership.user_id]",
        back_populates="manager"
    )
    # Health center memberships (for doctors/admins)
    health_center_memberships: Mapped[List["HealthCenterMembership"]] = relationship(
        "HealthCenterMembership",
        foreign_keys="[HealthCenterMembership.user_id]",
        back_populates="user"
    )

