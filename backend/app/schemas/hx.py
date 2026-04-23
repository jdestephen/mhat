from typing import Optional, List
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, model_validator
from enum import Enum

# Enums
class RecordStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    BACKED_BY_DOCUMENT = "BACKED_BY_DOCUMENT"
    VERIFIED = "VERIFIED"

class VitalSignsStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    VERIFIED = "VERIFIED"

class DiagnosisRank(int, Enum):
    PRIMARY = 1
    SECONDARY = 2
    TERTIARY = 3
    QUATERNARY = 4
    QUINARY = 5

class DiagnosisStatus(str, Enum):
    CONFIRMED = "CONFIRMED"
    PROVISIONAL = "PROVISIONAL"
    DIFFERENTIAL = "DIFFERENTIAL"
    REFUTED = "REFUTED"
    ENTERED_IN_ERROR = "ENTERED_IN_ERROR"

# Documents
class DocumentBase(BaseModel):
    s3_key: str
    filename: str
    url: str
    media_type: str
    tags: Optional[List[str]] = []
    ocr_text: Optional[str] = None

class DocumentCreate(DocumentBase):
    pass

class Document(DocumentBase):
    id: UUID
    medical_record_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

    @model_validator(mode='after')
    def refresh_presigned_url(self) -> 'Document':
        """Replace the stale stored URL with a fresh presigned URL."""
        from app.services.storage import get_presigned_url
        self.url = get_presigned_url(self.s3_key)
        return self

# Medical Diagnoses
class MedicalDiagnosisBase(BaseModel):
    diagnosis: str
    diagnosis_code: Optional[str] = None
    diagnosis_code_system: Optional[str] = None
    rank: int = 1  # Default to primary
    status: DiagnosisStatus = DiagnosisStatus.PROVISIONAL
    notes: Optional[str] = None

class MedicalDiagnosisCreate(MedicalDiagnosisBase):
    pass

class MedicalDiagnosisUpdate(BaseModel):
    diagnosis: Optional[str] = None
    diagnosis_code: Optional[str] = None
    diagnosis_code_system: Optional[str] = None
    rank: Optional[int] = None
    status: Optional[DiagnosisStatus] = None
    notes: Optional[str] = None

class MedicalDiagnosis(MedicalDiagnosisBase):
    id: UUID
    medical_record_id: UUID
    created_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# Medical Records
class MedicalRecordBase(BaseModel):
    motive: str
    notes: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[List[str]] = Field(default_factory=list)

class Category(BaseModel):
    id: int
    name: str
    has_diagnosis: bool
    documents: bool = False
    order: int

    class Config:
        orm_mode = True

class MedicalRecordCreate(MedicalRecordBase):
    diagnoses: Optional[List[MedicalDiagnosisCreate]] = Field(default_factory=list)

class MedicalRecordUpdate(BaseModel):
    motive: Optional[str] = None
    notes: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[List[str]] = None
    diagnoses: Optional[List[MedicalDiagnosisCreate]] = None

# Inline response schemas for prescriptions/orders to avoid circular imports
class PrescriptionInline(BaseModel):
    """Inline prescription for MedicalRecord response."""
    id: UUID
    medication_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    route: Optional[str] = None
    quantity: Optional[str] = None
    instructions: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ClinicalOrderInline(BaseModel):
    """Inline clinical order for MedicalRecord response."""
    id: UUID
    order_type: str
    description: str
    urgency: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    referral_to: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Vital Signs
class VitalSignsBase(BaseModel):
    heart_rate: Optional[int] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    temperature: Optional[float] = None
    respiratory_rate: Optional[int] = None
    oxygen_saturation: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    blood_glucose: Optional[float] = None
    waist_circumference: Optional[float] = None
    notes: Optional[str] = None
    measured_at: Optional[datetime] = None

class VitalSignsCreate(VitalSignsBase):
    pass

class VitalSignsUpdate(VitalSignsBase):
    pass

class VitalSignsResponse(VitalSignsBase):
    id: UUID
    patient_id: UUID
    medical_record_id: Optional[UUID] = None
    status: VitalSignsStatus = VitalSignsStatus.UNVERIFIED
    created_by: UUID
    created_at: datetime
    updated_by: Optional[UUID] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class VitalSignsInline(VitalSignsBase):
    """Inline vital signs for MedicalRecord response."""
    id: UUID
    status: VitalSignsStatus = VitalSignsStatus.UNVERIFIED
    created_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class MedicalRecord(MedicalRecordBase):
    id: UUID
    patient_id: UUID
    status: RecordStatus
    created_by: UUID
    verified_by: Optional[UUID] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    diagnoses: List[MedicalDiagnosis] = []
    documents: List[Document] = []
    category: Optional[Category] = None
    brief_history: Optional[str] = None
    has_red_flags: Optional[bool] = None
    red_flags: Optional[List[str]] = None
    key_finding: Optional[str] = None
    clinical_impression: Optional[str] = None
    actions_today: Optional[List[str]] = None
    plan_bullets: Optional[List[str]] = None
    follow_up_interval: Optional[str] = None
    follow_up_with: Optional[str] = None
    patient_instructions: Optional[str] = None
    prescriptions: List[PrescriptionInline] = []
    clinical_orders: List[ClinicalOrderInline] = []
    vital_signs: Optional[VitalSignsInline] = None

    class Config:
        from_attributes = True


class RecordViewLogResponse(BaseModel):
    """Response schema for record view log entries."""
    id: UUID
    doctor_name: str
    viewed_at: datetime

    class Config:
        from_attributes = True
