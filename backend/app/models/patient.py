from sqlalchemy import String, Integer, ForeignKey, DateTime, Date, ARRAY, Enum, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
from uuid import UUID
import uuid
from datetime import datetime, date
import enum

from app.db.base_class import Base

# --- Enums ---
class AllergyType(str, enum.Enum):
    MEDICATION = "medication"
    FOOD = "food"
    SUBSTANCE = "substance"
    OTHER = "other"

class AllergySeverity(str, enum.Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    UNKNOWN = "unknown"

class AllergySource(str, enum.Enum):
    DOCTOR = "doctor"
    SUSPECTED = "suspected"
    NOT_SURE = "not_sure"

class AllergyStatus(str, enum.Enum):
    UNVERIFIED = "unverified"
    VERIFIED = "verified"

class ConditionStatus(str, enum.Enum):
    ACTIVE = "active"
    CONTROLLED = "controlled"
    RESOLVED = "resolved"
    UNKNOWN = "unknown"

class ConditionSource(str, enum.Enum):
    DOCTOR = "doctor"
    SUSPECTED = "suspected"

# --- Models ---

class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # user_id is now nullable to support profiles without user accounts (e.g., minors)
    user_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Demographic fields (previously inherited from User)
    # Required for standalone patient profiles without user accounts
    first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    blood_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="patient_profile")
    medications: Mapped[List["Medication"]] = relationship("Medication", back_populates="patient_profile")
    medical_records: Mapped[List["MedicalRecord"]] = relationship("MedicalRecord", back_populates="patient")
    allergies: Mapped[List["Allergy"]] = relationship("Allergy", back_populates="patient_profile")
    conditions: Mapped[List["Condition"]] = relationship("Condition", back_populates="patient_profile")
    share_tokens: Mapped[List["ShareToken"]] = relationship("ShareToken", back_populates="patient")
    # Who manages this patient profile (family members with access)
    managed_by: Mapped[List["FamilyMembership"]] = relationship("FamilyMembership", back_populates="patient_profile")

class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_profile_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("patient_profiles.id"), nullable=False)
    
    name: Mapped[str] = mapped_column(String, nullable=False)
    dosage: Mapped[str] = mapped_column(String, nullable=False)
    frequency: Mapped[str] = mapped_column(String, nullable=False)

    patient_profile: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="medications")

class Allergy(Base):
    __tablename__ = "allergies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_profile_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("patient_profiles.id"), nullable=False)
    
    allergen: Mapped[str] = mapped_column(String, nullable=False) # "To what?"
    code: Mapped[str] = mapped_column(String, nullable=False) # SNOMED CT code
    code_system: Mapped[str] = mapped_column(String, nullable=False) # e.g., "http://snomed.info/sct"
    type: Mapped[AllergyType] = mapped_column(Enum(AllergyType), default=AllergyType.OTHER, nullable=False)
    reaction: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    severity: Mapped[AllergySeverity] = mapped_column(Enum(AllergySeverity), default=AllergySeverity.UNKNOWN, nullable=False)
    source: Mapped[AllergySource] = mapped_column(Enum(AllergySource), default=AllergySource.NOT_SURE, nullable=False)
    status: Mapped[AllergyStatus] = mapped_column(Enum(AllergyStatus), default=AllergyStatus.UNVERIFIED, nullable=False)
    
    # Timestamps and soft delete
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    verified_by: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Doctor who verified
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    verifier: Mapped[Optional["User"]] = relationship("User", foreign_keys=[verified_by])
    patient_profile: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="allergies")

class Condition(Base):
    __tablename__ = "conditions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_profile_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("patient_profiles.id"), nullable=False)
    
    name: Mapped[str] = mapped_column(String, nullable=False) # "condition"
    code: Mapped[str] = mapped_column(String, nullable=False) # SNOMED CT code
    code_system: Mapped[str] = mapped_column(String, nullable=False) # e.g., "http://snomed.info/sct"
    since_year: Mapped[Optional[str]] = mapped_column(String, nullable=True) # "since" (Year or "No sé")
    status: Mapped[ConditionStatus] = mapped_column(Enum(ConditionStatus), default=ConditionStatus.UNKNOWN, nullable=False)
    source: Mapped[ConditionSource] = mapped_column(Enum(ConditionSource), default=ConditionSource.SUSPECTED, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Timestamps and soft delete
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    verified_by: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Doctor who verified
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    verifier: Mapped[Optional["User"]] = relationship("User", foreign_keys=[verified_by])
    patient_profile: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="conditions")
