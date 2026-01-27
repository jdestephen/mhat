from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum

# Enums
class RecordStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    BACKED_BY_DOCUMENT = "BACKED_BY_DOCUMENT"
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
        orm_mode = True

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

    class Config:
        orm_mode = True

class MedicalRecordCreate(MedicalRecordBase):
    diagnoses: Optional[List[MedicalDiagnosisCreate]] = Field(default_factory=list)

class MedicalRecordUpdate(MedicalRecordBase):
    pass

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

    class Config:
        from_attributes = True
