"""Per-doctor letterhead and document printing preferences."""
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class DoctorPrintSettings(Base):
    __tablename__ = "doctor_print_settings"

    doctor_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    name_override: Mapped[str | None] = mapped_column(String(200))
    degree_override: Mapped[str | None] = mapped_column(String(200))
    clinic_name: Mapped[str | None] = mapped_column(String(200))
    phone_1: Mapped[str | None] = mapped_column(String(50))
    phone_2: Mapped[str | None] = mapped_column(String(50))
    address: Mapped[str | None] = mapped_column(String(500))
    public_email: Mapped[str | None] = mapped_column(String(200))
    logo_key: Mapped[str | None] = mapped_column(String(500))
    logo_content_type: Mapped[str | None] = mapped_column(String(30))
    show_duration: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    paper_size: Mapped[str] = mapped_column(String(10), default="A4", nullable=False)
