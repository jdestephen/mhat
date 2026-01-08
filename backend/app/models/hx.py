from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, List
from datetime import datetime

from app.db.base_class import Base

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    
    medical_records: Mapped[List["MedicalRecord"]] = relationship("MedicalRecord", back_populates="category")

class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient_profiles.id"), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=True)
    
    motive: Mapped[str] = mapped_column(String, nullable=False)
    diagnosis: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="medical_records")
    category: Mapped["Category"] = relationship("Category", back_populates="medical_records")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="medical_record")

class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    medical_record_id: Mapped[int] = mapped_column(ForeignKey("medical_records.id"), nullable=False)
    
    s3_key: Mapped[str] = mapped_column(String, nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)
    media_type: Mapped[str] = mapped_column(String, nullable=False)  # 'pdf', 'image', etc.
    
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    ocr_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    medical_record: Mapped["MedicalRecord"] = relationship("MedicalRecord", back_populates="documents")
