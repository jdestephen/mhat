from typing import List, Optional
from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel
from enum import Enum

# Enums
class AllergyType(str, Enum):
    MEDICATION = "MEDICATION"
    FOOD = "FOOD"
    SUBSTANCE = "SUBSTANCE"
    OTHER = "OTHER"

class AllergySeverity(str, Enum):
    MILD = "MILD"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"
    UNKNOWN = "UNKNOWN"

class AllergySource(str, Enum):
    DOCTOR = "DOCTOR"
    SUSPECTED = "SUSPECTED"
    NOT_SURE = "NOT_SURE"

class AllergyStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    VERIFIED = "VERIFIED"

class ConditionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    CONTROLLED = "CONTROLLED"
    RESOLVED = "RESOLVED"
    UNKNOWN = "UNKNOWN"

class ConditionSource(str, Enum):
    DOCTOR = "DOCTOR"
    SUSPECTED = "SUSPECTED"

class MedicationStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    STOPPED = "STOPPED"
    ON_HOLD = "ON_HOLD"
    ENTERED_IN_ERROR = "ENTERED_IN_ERROR"
    NOT_TAKEN = "NOT_TAKEN"

class MedicationSource(str, Enum):
    PRESCRIBED = "PRESCRIBED"
    OTC = "OTC"
    SELF_REPORTED = "SELF_REPORTED"
    TRANSFERRED = "TRANSFERRED"

class RelationshipType(str, Enum):
    PADRE = "PADRE"
    MADRE = "MADRE"
    HERMANO_A = "HERMANO_A"
    ESPOSO_A = "ESPOSO_A"
    HIJO_A = "HIJO_A"
    TIO_A = "TIO_A"
    ABUELO_A = "ABUELO_A"
    AMIGO_A = "AMIGO_A"
    GUARDIAN = "GUARDIAN"
    OTRO = "OTRO"

# Habit Enums
class TobaccoUse(str, Enum):
    NEVER = "NEVER"
    EX_SMOKER = "EX_SMOKER"
    OCCASIONAL = "OCCASIONAL"
    ACTIVE = "ACTIVE"

class AlcoholUse(str, Enum):
    NONE = "NONE"
    OCCASIONAL = "OCCASIONAL"
    SOCIAL = "SOCIAL"
    FREQUENT = "FREQUENT"

class PhysicalActivity(str, Enum):
    SEDENTARY = "SEDENTARY"
    ONE_TWO = "ONE_TWO"
    THREE_FOUR = "THREE_FOUR"
    FIVE_PLUS = "FIVE_PLUS"

class DietType(str, Enum):
    BALANCED = "BALANCED"
    HIGH_CARB = "HIGH_CARB"
    HIGH_FAT = "HIGH_FAT"
    VEGETARIAN = "VEGETARIAN"
    VEGAN = "VEGAN"
    OTHER = "OTHER"

class FamilyMemberType(str, Enum):
    PADRE = "PADRE"
    MADRE = "MADRE"
    HERMANO_A = "HERMANO_A"
    ABUELO_PATERNO = "ABUELO_PATERNO"
    ABUELA_PATERNA = "ABUELA_PATERNA"
    ABUELO_MATERNO = "ABUELO_MATERNO"
    ABUELA_MATERNA = "ABUELA_MATERNA"
    TIO_A = "TIO_A"
    OTRO = "OTRO"


# Medication
class MedicationBase(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
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
    route: Optional[str] = None
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
    code: Optional[str] = None
    code_system: Optional[str] = None
    type: AllergyType
    reaction: Optional[str] = None
    severity: AllergySeverity
    source: AllergySource
    status: AllergyStatus

class AllergyCreate(AllergyBase):
    pass

class AllergyUpdate(BaseModel):
    allergen: Optional[str] = None
    code: Optional[str] = None
    code_system: Optional[str] = None
    type: Optional[AllergyType] = None
    reaction: Optional[str] = None
    severity: Optional[AllergySeverity] = None
    source: Optional[AllergySource] = None
    status: Optional[AllergyStatus] = None

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
    code: Optional[str] = None
    code_system: Optional[str] = None
    since_year: Optional[str] = None
    status: ConditionStatus
    source: ConditionSource
    notes: Optional[str] = None

class ConditionCreate(ConditionBase):
    pass

class ConditionUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    code_system: Optional[str] = None
    since_year: Optional[str] = None
    status: Optional[ConditionStatus] = None
    source: Optional[ConditionSource] = None
    notes: Optional[str] = None

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


# Personal Reference
class PersonalReferenceBase(BaseModel):
    name: str
    phone: str
    relationship_type: RelationshipType

class PersonalReferenceCreate(PersonalReferenceBase):
    pass

class PersonalReferenceUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relationship_type: Optional[RelationshipType] = None

class PersonalReference(PersonalReferenceBase):
    id: int
    patient_profile_id: UUID

    class Config:
        from_attributes = True


# Health Habits
class HealthHabitUpsert(BaseModel):
    tobacco_use: Optional[TobaccoUse] = None
    cigarettes_per_day: Optional[int] = None
    years_smoking: Optional[int] = None
    years_since_quit: Optional[int] = None
    alcohol_use: Optional[AlcoholUse] = None
    drinks_per_week: Optional[int] = None
    drug_use: Optional[bool] = None
    drug_type: Optional[str] = None
    drug_frequency: Optional[str] = None
    physical_activity: Optional[PhysicalActivity] = None
    diet: Optional[DietType] = None
    sleep_hours: Optional[float] = None
    sleep_problems: Optional[bool] = None
    observations: Optional[str] = None

class HealthHabit(HealthHabitUpsert):
    id: int
    patient_profile_id: UUID

    class Config:
        from_attributes = True


# Family History
class FamilyHistoryConditionCreate(BaseModel):
    condition_name: str
    family_members: List[str]
    notes: Optional[str] = None

class FamilyHistoryConditionUpdate(BaseModel):
    condition_name: Optional[str] = None
    family_members: Optional[List[str]] = None
    notes: Optional[str] = None

class FamilyHistoryConditionResponse(FamilyHistoryConditionCreate):
    id: int
    patient_profile_id: UUID

    class Config:
        from_attributes = True


# Patient Profile
class PatientProfileBase(BaseModel):
    date_of_birth: Optional[date] = None
    blood_type: Optional[str] = None
    dni: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

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
    personal_references: List[PersonalReference] = []
    health_habit: Optional[HealthHabit] = None
    family_history: List[FamilyHistoryConditionResponse] = []

    class Config:
        from_attributes = True


