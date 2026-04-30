from sqlalchemy import String, ForeignKey, Date, Text, ARRAY, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
from uuid import UUID
import uuid
import enum
from datetime import date, datetime

from app.db.base_class import Base


class DoctorApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    degree: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    short_bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dni: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    college_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    verification_phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Hospitals/Clinics where they work
    workplaces: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)

    # Approval workflow
    approval_status: Mapped[DoctorApprovalStatus] = mapped_column(
        Enum(DoctorApprovalStatus, name="doctorapprovalstatus", create_type=True),
        default=DoctorApprovalStatus.PENDING,
        server_default="PENDING",
        nullable=False,
    )
    approved_by: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="doctor_profile", foreign_keys=[user_id])
