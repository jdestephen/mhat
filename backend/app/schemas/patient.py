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


# Medication
class MedicationBase(BaseModel):
    name: str
    dosage: str
    frequency: str

class MedicationCreate(MedicationBase):
    pass

class Medication(MedicationBase):
    id: int
    patient_profile_id: UUID

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
