from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel
from enum import Enum

# Enums
class RecordStatus(str, Enum):
    UNVERIFIED = "unverified"
    BACKED_BY_DOCUMENT = "backed_by_document"
    VERIFIED = "verified"

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
    id: int
    medical_record_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Medical Records
class MedicalRecordBase(BaseModel):
    motive: str
    diagnosis: Optional[str] = None
    diagnosis_code: Optional[str] = None
    diagnosis_code_system: Optional[str] = None
    notes: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[List[str]] = []

class Category(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True

class MedicalRecordCreate(MedicalRecordBase):
    pass

class MedicalRecordUpdate(MedicalRecordBase):
    pass

class MedicalRecord(MedicalRecordBase):
    id: int
    patient_id: int
    status: RecordStatus
    created_by: int
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    documents: List[Document] = []
    category: Optional[Category] = None

    class Config:
        from_attributes = True
