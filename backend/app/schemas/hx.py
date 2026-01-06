from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel

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
    title: str
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    category_id: Optional[int] = None

class MedicalRecordCreate(MedicalRecordBase):
    pass

class MedicalRecordUpdate(MedicalRecordBase):
    pass

class MedicalRecord(MedicalRecordBase):
    id: int
    patient_id: int
    created_at: datetime
    documents: List[Document] = []

    class Config:
        orm_mode = True
