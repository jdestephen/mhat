from typing import Optional, List
from pydantic import BaseModel
from datetime import date

class MedicationBase(BaseModel):
    name: str
    dosage: str
    frequency: str

class MedicationCreate(MedicationBase):
    pass

class Medication(MedicationBase):
    id: int
    patient_profile_id: int

    class Config:
        orm_mode = True

class PatientProfileBase(BaseModel):
    date_of_birth: Optional[date] = None
    blood_type: Optional[str] = None
    previous_diagnoses: Optional[List[str]] = []

class PatientProfileCreate(PatientProfileBase):
    pass

class PatientProfileUpdate(PatientProfileBase):
    pass

class PatientProfile(PatientProfileBase):
    id: int
    user_id: int
    medications: List[Medication] = []

    class Config:
        orm_mode = True
