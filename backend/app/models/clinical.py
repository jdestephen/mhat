"""
Clinical Models

Models for doctor-created clinical data: prescriptions, orders, and related entities.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
import uuid
import enum

from sqlalchemy import (
    String, Boolean, Integer, Text, DateTime, ForeignKey, func, Enum
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class OrderType(str, enum.Enum):
    """Types of clinical orders."""
    LAB = "LAB"                 # Laboratory tests
    IMAGING = "IMAGING"         # X-ray, CT, MRI, etc.
    REFERRAL = "REFERRAL"       # Specialist referral
    PROCEDURE = "PROCEDURE"     # Medical procedure


class OrderUrgency(str, enum.Enum):
    """Urgency level for clinical orders."""
    ROUTINE = "ROUTINE"
    URGENT = "URGENT"
    STAT = "STAT"


class Prescription(Base):
    """
    Represents a prescription written by a doctor during an encounter.
    
    Attached to a medical record. Visible to patients by default.
    When processed, it may create/update a Medication entry in the patient's list.
    """
    __tablename__ = "prescriptions"
    
    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    medical_record_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("medical_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Medication details
    medication_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., "500mg"
    frequency: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., "cada 8 horas"
    duration: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., "7 días"
    route: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # oral, IV, IM, topical, etc.
    quantity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # e.g., "21 tabletas"
    
    # Instructions
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Visibility - patients can see prescriptions
    is_doctor_only: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Link to medication list (optional - when synced to patient's medications)
    linked_medication_id: Mapped[Optional[int]] = mapped_column(
        Integer, 
        ForeignKey("medications.id"),
        nullable=True
    )
    
    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    created_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )
    
    # Relationships
    medical_record: Mapped["MedicalRecord"] = relationship(
        "MedicalRecord",
        back_populates="prescriptions"
    )
    linked_medication: Mapped[Optional["Medication"]] = relationship("Medication")
    creator: Mapped["User"] = relationship("User")


class ClinicalOrder(Base):
    """
    Represents a clinical order (lab, imaging, referral, procedure) by a doctor.
    
    Attached to a medical record. Visible to patients by default.
    """
    __tablename__ = "clinical_orders"
    
    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    medical_record_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("medical_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Order details
    order_type: Mapped[OrderType] = mapped_column(
        Enum(OrderType),
        nullable=False
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)  # What is being ordered
    urgency: Mapped[OrderUrgency] = mapped_column(
        Enum(OrderUrgency),
        default=OrderUrgency.ROUTINE,
        nullable=False
    )
    
    # Optional details
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Clinical justification
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Internal notes
    
    # For referrals
    referral_to: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # Specialist/clinic name
    
    # Visibility - patients can see orders
    is_doctor_only: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    created_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )
    
    # Relationships
    medical_record: Mapped["MedicalRecord"] = relationship(
        "MedicalRecord",
        back_populates="clinical_orders"
    )
    creator: Mapped["User"] = relationship("User")
