"""
Clinical Schemas

Pydantic schemas for prescriptions, clinical orders, and doctor-created data.
"""
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum


class OrderType(str, Enum):
    """Types of clinical orders."""
    LAB = "LAB"
    IMAGING = "IMAGING"
    REFERRAL = "REFERRAL"
    PROCEDURE = "PROCEDURE"


class OrderUrgency(str, Enum):
    """Urgency level for clinical orders."""
    ROUTINE = "ROUTINE"
    URGENT = "URGENT"
    STAT = "STAT"


class RecordSource(str, Enum):
    """Source of medical record creation."""
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    IMPORTED = "IMPORTED"


class AccessLevel(str, Enum):
    """Doctor's access level to patient records."""
    READ_ONLY = "READ_ONLY"
    WRITE = "WRITE"


# =====================
# Prescription Schemas
# =====================

class PrescriptionBase(BaseModel):
    """Base prescription fields."""
    medication_name: str = Field(..., max_length=200)
    dosage: Optional[str] = Field(None, max_length=100)
    frequency: Optional[str] = Field(None, max_length=100)
    duration: Optional[str] = Field(None, max_length=100)
    route: Optional[str] = Field(None, max_length=50)
    quantity: Optional[str] = Field(None, max_length=50)
    instructions: Optional[str] = None


class PrescriptionCreate(PrescriptionBase):
    """Schema for creating a prescription."""
    pass


class PrescriptionUpdate(BaseModel):
    """Schema for updating a prescription."""
    medication_name: Optional[str] = Field(None, max_length=200)
    dosage: Optional[str] = Field(None, max_length=100)
    frequency: Optional[str] = Field(None, max_length=100)
    duration: Optional[str] = Field(None, max_length=100)
    route: Optional[str] = Field(None, max_length=50)
    quantity: Optional[str] = Field(None, max_length=50)
    instructions: Optional[str] = None


class PrescriptionResponse(PrescriptionBase):
    """Schema for prescription response."""
    id: UUID
    medical_record_id: UUID
    created_at: datetime
    created_by: UUID

    class Config:
        from_attributes = True


# =====================
# Clinical Order Schemas
# =====================

class ClinicalOrderBase(BaseModel):
    """Base clinical order fields."""
    order_type: OrderType
    description: str = Field(..., max_length=500)
    urgency: OrderUrgency = OrderUrgency.ROUTINE
    reason: Optional[str] = None
    notes: Optional[str] = None
    referral_to: Optional[str] = Field(None, max_length=200)


class ClinicalOrderCreate(ClinicalOrderBase):
    """Schema for creating a clinical order."""
    pass


class ClinicalOrderUpdate(BaseModel):
    """Schema for updating a clinical order."""
    order_type: Optional[OrderType] = None
    description: Optional[str] = Field(None, max_length=500)
    urgency: Optional[OrderUrgency] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    referral_to: Optional[str] = Field(None, max_length=200)


class ClinicalOrderResponse(ClinicalOrderBase):
    """Schema for clinical order response."""
    id: UUID
    medical_record_id: UUID
    created_at: datetime
    created_by: UUID

    class Config:
        from_attributes = True


# =====================
# Doctor Patient Access
# =====================

class DoctorPatientAccessCreate(BaseModel):
    """Grant doctor access to patient."""
    doctor_id: UUID
    access_level: AccessLevel = AccessLevel.READ_ONLY


class DoctorPatientAccessResponse(BaseModel):
    """Doctor access information."""
    id: UUID
    doctor_id: UUID
    patient_profile_id: UUID
    access_level: AccessLevel
    granted_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PatientAccessSummary(BaseModel):
    """Summary of patient for doctor's list."""
    patient_id: UUID
    first_name: str
    last_name: str
    date_of_birth: Optional[datetime] = None
    access_level: AccessLevel
    granted_at: Optional[datetime] = None  # Maps from created_at in the endpoint


# =====================
# Doctor Medical Record
# =====================

class DoctorMedicalRecordCreate(BaseModel):
    """Schema for doctor creating a medical record."""
    # Core fields
    motive: str
    notes: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    
    # Doctor-specific fields
    brief_history: Optional[str] = Field(None, max_length=300)
    has_red_flags: bool = False
    red_flags: Optional[List[str]] = None
    key_finding: Optional[str] = Field(None, max_length=250)
    clinical_impression: Optional[str] = None
    actions_today: Optional[List[str]] = None
    plan_bullets: Optional[List[str]] = Field(None, max_length=3)
    
    # Patient-visible fields
    follow_up_interval: Optional[str] = Field(None, max_length=50)
    follow_up_with: Optional[str] = Field(None, max_length=200)
    patient_instructions: Optional[str] = Field(None, max_length=350)
    
    # Nested clinical data
    diagnoses: Optional[List["MedicalDiagnosisCreate"]] = Field(default_factory=list)
    prescriptions: Optional[List[PrescriptionCreate]] = Field(default_factory=list)
    orders: Optional[List[ClinicalOrderCreate]] = Field(default_factory=list)


class DoctorMedicalRecordUpdate(BaseModel):
    """Schema for doctor updating a medical record."""
    motive: Optional[str] = None
    notes: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[List[str]] = None
    
    brief_history: Optional[str] = Field(None, max_length=300)
    has_red_flags: Optional[bool] = None
    red_flags: Optional[List[str]] = None
    key_finding: Optional[str] = Field(None, max_length=250)
    clinical_impression: Optional[str] = None
    actions_today: Optional[List[str]] = None
    plan_bullets: Optional[List[str]] = None
    
    follow_up_interval: Optional[str] = Field(None, max_length=50)
    follow_up_with: Optional[str] = Field(None, max_length=200)
    patient_instructions: Optional[str] = Field(None, max_length=350)


class RecordVerification(BaseModel):
    """Schema for verifying a patient record."""
    notes: Optional[str] = None  # Optional verification notes


# =====================
# Access Invitation Schemas
# =====================

class AccessInvitationCreate(BaseModel):
    """Schema for patient creating an invitation."""
    access_level: AccessLevel = AccessLevel.READ_ONLY
    access_type: str = "PERMANENT"  # PERMANENT or TEMPORARY
    expires_in_days: Optional[int] = None  # Required if access_type is TEMPORARY


class AccessInvitationResponse(BaseModel):
    """Schema for invitation response."""
    id: UUID
    code: str
    access_level: AccessLevel
    access_type: str
    expires_in_days: Optional[int] = None
    code_expires_at: datetime
    claimed_by: Optional[UUID] = None
    claimed_at: Optional[datetime] = None
    is_revoked: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ClaimInvitationRequest(BaseModel):
    """Schema for doctor claiming an invitation code."""
    code: str = Field(..., max_length=20)


class DoctorAccessInfo(BaseModel):
    """Info about a doctor with access, for patient view."""
    access_id: UUID
    doctor_id: UUID
    doctor_name: str
    specialty: Optional[str] = None
    access_level: str
    access_type: str
    granted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Import at end to avoid circular imports
from app.schemas.hx import MedicalDiagnosisCreate

# Update forward references
DoctorMedicalRecordCreate.model_rebuild()
