from sqlalchemy import String, Integer, ForeignKey, DateTime, Date, ARRAY, Enum, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, List
from uuid import UUID
import uuid
from datetime import datetime, date
import enum

from app.db.base_class import Base

# --- Enums ---
class AllergyType(str, enum.Enum):
    MEDICATION = "MEDICATION"
    FOOD = "FOOD"
    SUBSTANCE = "SUBSTANCE"
    OTHER = "OTHER"

class AllergySeverity(str, enum.Enum):
    MILD = "MILD"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"
    UNKNOWN = "UNKNOWN"

class AllergySource(str, enum.Enum):
    DOCTOR = "DOCTOR"
    SUSPECTED = "SUSPECTED"
    NOT_SURE = "NOT_SURE"

class AllergyStatus(str, enum.Enum):
    UNVERIFIED = "UNVERIFIED"
    VERIFIED = "VERIFIED"

class ConditionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CONTROLLED = "CONTROLLED"
    RESOLVED = "RESOLVED"
    UNKNOWN = "UNKNOWN"

class ConditionSource(str, enum.Enum):
    DOCTOR = "DOCTOR"
    SUSPECTED = "SUSPECTED"

class MedicationStatus(str, enum.Enum):
    """FHIR MedicationStatement status values"""
    ACTIVE = "ACTIVE"                    # Currently taking
    COMPLETED = "COMPLETED"              # Finished the course
    STOPPED = "STOPPED"                  # Stopped before completion
    ON_HOLD = "ON_HOLD"                  # Temporarily paused
    ENTERED_IN_ERROR = "ENTERED_IN_ERROR"  # Mistaken entry
    NOT_TAKEN = "NOT_TAKEN"              # Patient chose not to take

class MedicationSource(str, enum.Enum):
    """Source/origin of the medication record"""
    PRESCRIBED = "PRESCRIBED"            # Prescribed by a doctor
    OTC = "OTC"                         # Over-the-counter
    SELF_REPORTED = "SELF_REPORTED"     # Patient self-reported
    TRANSFERRED = "TRANSFERRED"          # From another facility/system

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
    
    # Basic medication info
    name: Mapped[str] = mapped_column(String, nullable=False)
    dosage: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    frequency: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Status tracking (FHIR MedicationStatement)
    status: Mapped[MedicationStatus] = mapped_column(Enum(MedicationStatus), default=MedicationStatus.ACTIVE, nullable=False)
    status_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # Why stopped/on-hold
    
    # Temporal tracking
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  # NULL = still taking
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Source and prescriber information
    source: Mapped[MedicationSource] = mapped_column(Enum(MedicationSource), default=MedicationSource.SELF_REPORTED, nullable=False)
    prescribed_by_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Internal doctor
    external_prescriber_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # External doctor name
    
    # Condition relationship (why is the patient taking this?)
    condition_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("conditions.id"), nullable=True)
    
    # Additional information
    instructions: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # "Take with food"
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Patient notes
    
    # Audit fields
    created_by_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    patient_profile: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="medications")
    condition: Mapped[Optional["Condition"]] = relationship("Condition", back_populates="medications")
    prescribed_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[prescribed_by_id])
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])

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
    medications: Mapped[List["Medication"]] = relationship("Medication", back_populates="condition")
