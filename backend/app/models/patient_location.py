"""
Patient Location model — supports multiple saved locations per patient profile
for home visit scheduling.
"""
from sqlalchemy import String, Float, Integer, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional
from uuid import UUID
from datetime import datetime

from app.db.base_class import Base


class PatientLocation(Base):
    __tablename__ = "patient_locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_profile_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("patient_profiles.id"), nullable=False
    )

    label: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    patient_profile: Mapped["PatientProfile"] = relationship(
        "PatientProfile", back_populates="locations"
    )
