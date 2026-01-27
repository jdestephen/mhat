from typing import List, Optional
from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel
from enum import Enum

# Enums
class AllergyType(str, Enum):
    MEDICATION = "medication"
    FOOD = "food"
    SUBSTANCE = "substance"
    OTHER = "other"

class AllergySeverity(str, Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    UNKNOWN = "unknown"

class AllergySource(str, Enum):
    DOCTOR = "doctor"
    SUSPECTED = "suspected"
    NOT_SURE = "not_sure"

class AllergyStatus(str, Enum):
    UNVERIFIED = "unverified"
    VERIFIED = "verified"

class ConditionStatus(str, Enum):
    ACTIVE = "active"
    CONTROLLED = "controlled"
    RESOLVED = "resolved"
    UNKNOWN = "unknown"

class ConditionSource(str, Enum):
    DOCTOR = "doctor"
    SUSPECTED = "suspected"

class MedicationStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    STOPPED = "stopped"
    ON_HOLD = "on_hold"
    ENTERED_IN_ERROR = "entered_in_error"
    NOT_TAKEN = "not_taken"

class MedicationSource(str, Enum):
    PRESCRIBED = "prescribed"
    OTC = "otc"
    SELF_REPORTED = "self_reported"
    TRANSFERRED = "transferred"


# Medication
class MedicationBase(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    status: MedicationStatus = MedicationStatus.ACTIVE
    status_reason: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    source: MedicationSource = MedicationSource.SELF_REPORTED
    prescribed_by_id: Optional[UUID] = None
    external_prescriber_name: Optional[str] = None
    condition_id: Optional[int] = None
    instructions: Optional[str] = None
    notes: Optional[str] = None

class MedicationCreate(MedicationBase):
    pass

class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    status: Optional[MedicationStatus] = None
    status_reason: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    source: Optional[MedicationSource] = None
    prescribed_by_id: Optional[UUID] = None
    external_prescriber_name: Optional[str] = None
    condition_id: Optional[int] = None
    instructions: Optional[str] = None
    notes: Optional[str] = None

class Medication(MedicationBase):
    id: int
    patient_profile_id: UUID
    recorded_at: datetime
    created_by_id: UUID
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Allergy
class AllergyBase(BaseModel):
    allergen: str
    code: str
    code_system: str
    type: AllergyType
    reaction: Optional[str] = None
    severity: AllergySeverity
    source: AllergySource
    status: AllergyStatus

class AllergyCreate(AllergyBase):
    pass

class Allergy(AllergyBase):
    id: int
    patient_profile_id: UUID
    created_at: datetime
    deleted: bool
    deleted_at: Optional[datetime] = None
    verified_by: Optional[UUID] = None
    verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Condition
class ConditionBase(BaseModel):
    name: str
    code: str
    code_system: str
    since_year: Optional[str] = None
    status: ConditionStatus
    source: ConditionSource
    notes: Optional[str] = None

class ConditionCreate(ConditionBase):
    pass

class Condition(ConditionBase):
    id: int
    patient_profile_id: UUID
    created_at: datetime
    deleted: bool
    deleted_at: Optional[datetime] = None
    verified_by: Optional[UUID] = None
    verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Patient Profile
class PatientProfileBase(BaseModel):
    date_of_birth: Optional[date] = None
    blood_type: Optional[str] = None

class PatientProfileCreate(PatientProfileBase):
    pass

class PatientProfileUpdate(PatientProfileBase):
    pass

class PatientProfile(PatientProfileBase):
    id: UUID
    user_id: UUID
    medications: List[Medication] = []
    allergies: List[Allergy] = []
    conditions: List[Condition] = []

    class Config:
        from_attributes = True
