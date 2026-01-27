from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, ARRAY, Enum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, List
from uuid import UUID
import uuid
from datetime import datetime
import enum

from app.db.base_class import Base

# Enums
class RecordStatus(str, enum.Enum):
    UNVERIFIED = "UNVERIFIED"
    BACKED_BY_DOCUMENT = "BACKED_BY_DOCUMENT"
    VERIFIED = "VERIFIED"

class DiagnosisRank(int, enum.Enum):
    PRIMARY = 1
    SECONDARY = 2
    TERTIARY = 3
    QUATERNARY = 4
    QUINARY = 5

class DiagnosisStatus(str, enum.Enum):
    CONFIRMED = "CONFIRMED"
    PROVISIONAL = "PROVISIONAL"
    DIFFERENTIAL = "DIFFERENTIAL"
    REFUTED = "REFUTED"
    ENTERED_IN_ERROR = "ENTERED_IN_ERROR"

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    
    medical_records: Mapped[List["MedicalRecord"]] = relationship("MedicalRecord", back_populates="category")

class MedicalDiagnosis(Base):
    """Represents a single diagnosis associated with a medical record (FHIR Condition-like)"""
    __tablename__ = "medical_diagnoses"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medical_record_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("medical_records.id", ondelete="CASCADE"), nullable=False)
    
    # Core diagnosis fields
    diagnosis: Mapped[str] = mapped_column(String, nullable=False)
    diagnosis_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # SNOMED CT, ICD-10
    diagnosis_code_system: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # e.g., "SNOMED-CT", "ICD-10-CM"
    
    # Clinical metadata
    rank: Mapped[int] = mapped_column(Integer, default=DiagnosisRank.PRIMARY, nullable=False)  # 1=primary, 2=secondary, etc.
    status: Mapped[DiagnosisStatus] = mapped_column(Enum(DiagnosisStatus), default=DiagnosisStatus.PROVISIONAL, nullable=False)
    
    # Optional: Per-diagnosis notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Audit
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Relationships
    medical_record: Mapped["MedicalRecord"] = relationship("MedicalRecord", back_populates="diagnoses")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("patient_profiles.id"), nullable=False)
    category_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("categories.id"), nullable=True)
    
    motive: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Global encounter notes
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    
    # Search field (auto-maintained by database trigger)
    search_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)    
    # Status tracking
    status: Mapped[RecordStatus] = mapped_column(Enum(RecordStatus), default=RecordStatus.UNVERIFIED, nullable=False)
    
    # Audit fields
    created_by: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    verified_by: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="medical_records")
    category: Mapped["Category"] = relationship("Category", back_populates="medical_records")
    diagnoses: Mapped[List["MedicalDiagnosis"]] = relationship("MedicalDiagnosis", back_populates="medical_record", cascade="all, delete-orphan")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="medical_record")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    verifier: Mapped[Optional["User"]] = relationship("User", foreign_keys=[verified_by])

class Document(Base):
    __tablename__ = "documents"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medical_record_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("medical_records.id"), nullable=False)
    
    s3_key: Mapped[str] = mapped_column(String, nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)
    media_type: Mapped[str] = mapped_column(String, nullable=False)  # 'pdf', 'image', etc.
    
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    ocr_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    medical_record: Mapped["MedicalRecord"] = relationship("MedicalRecord", back_populates="documents")
