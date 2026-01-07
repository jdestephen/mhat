from datetime import datetime
import enum
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func

from app.db.base_class import Base

class UserRole(str, enum.Enum):
    DOCTOR = "doctor"
    PATIENT = "patient"

class AccessType(str, enum.Enum):
    PERMANENT = "permanent"
    TEMPORARY = "temporary"

class DoctorPatientAccess(Base):
    __tablename__ = "doctor_patient_access"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    access_type: Mapped[AccessType] = mapped_column(Enum(AccessType), default=AccessType.PERMANENT)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.PATIENT, nullable=False)
    
    first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    city: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    patient_profile: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="user", uselist=False)
    doctor_profile: Mapped["DoctorProfile"] = relationship("DoctorProfile", back_populates="user", uselist=False)
