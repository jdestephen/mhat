from sqlalchemy import String, Integer, ForeignKey, Date, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
from uuid import UUID
import uuid
from datetime import date

from app.db.base_class import Base

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    degree: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    short_bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Hospitals/Clinics where they work
    workplaces: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="doctor_profile")
