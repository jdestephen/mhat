"""
Share Token Models

Models for secure, time-limited medical record sharing.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
import uuid
import enum

from sqlalchemy import (
    String, Boolean, Integer, Text, DateTime, ForeignKey, func, Enum
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class ShareType(str, enum.Enum):
    """Types of sharing: specific records or full medical summary."""
    SPECIFIC_RECORDS = "SPECIFIC_RECORDS"
    SUMMARY = "SUMMARY"



class ShareToken(Base):
    """
    Represents a secure, time-limited link for sharing medical records.
    
    Security features:
    - Cryptographically secure random token (64 characters)
    - Time-limited access with customizable expiration
    - Revocable by patient
    - Optional single-use access
    - Complete audit trail
    """
    __tablename__ = "share_tokens"
    
    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Cryptographically secure random token (64 characters)
    token: Mapped[str] = mapped_column(
        String(128), 
        unique=True, 
        index=True, 
        nullable=False
    )
    
    # Owner info
    patient_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), 
        nullable=False
    )
    created_by_user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False
    )
    
    # Share type - specific records or full summary
    share_type: Mapped[str] = mapped_column(
        Enum(ShareType, native_enum=False, length=50),
        default=ShareType.SPECIFIC_RECORDS,
        nullable=False
    )

    
    # Expiration
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=False
    )
    expiration_minutes: Mapped[int] = mapped_column(
        Integer, 
        default=20,
        nullable=False
    )  # For display purposes
    
    # Access control
    is_revoked: Mapped[bool] = mapped_column(
        Boolean, 
        default=False,
        nullable=False
    )
    is_single_use: Mapped[bool] = mapped_column(
        Boolean, 
        default=False,
        nullable=False
    )
    access_count: Mapped[int] = mapped_column(
        Integer, 
        default=0,
        nullable=False
    )
    
    # Optional metadata
    recipient_name: Mapped[Optional[str]] = mapped_column(
        String(200), 
        nullable=True
    )
    recipient_email: Mapped[Optional[str]] = mapped_column(
        String(200), 
        nullable=True
    )
    purpose: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )  # e.g., "Cardiologist consultation"
    
    # Relationships
    patient: Mapped["PatientProfile"] = relationship(
        "PatientProfile", 
        back_populates="share_tokens"
    )
    created_by: Mapped["User"] = relationship("User")
    shared_records: Mapped[List["SharedRecord"]] = relationship(
        "SharedRecord", 
        back_populates="share_token", 
        cascade="all, delete-orphan"
    )
    access_logs: Mapped[List["ShareAccessLog"]] = relationship(
        "ShareAccessLog", 
        back_populates="share_token", 
        cascade="all, delete-orphan"
    )


class SharedRecord(Base):
    """
    Junction table linking share tokens to specific medical records.
    Allows sharing multiple records with a single link.
    """
    __tablename__ = "shared_records"
    
    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    share_token_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("share_tokens.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    medical_record_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("medical_records.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    
    # Relationships
    share_token: Mapped["ShareToken"] = relationship(
        "ShareToken", 
        back_populates="shared_records"
    )
    medical_record: Mapped["MedicalRecord"] = relationship("MedicalRecord")


class ShareAccessLog(Base):
    """
    Audit log for tracking access to shared medical records.
    Required for HIPAA compliance.
    """
    __tablename__ = "share_access_logs"
    
    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    share_token_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("share_tokens.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    
    accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),  # IPv6 compatible
        nullable=True
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )
    
    # Relationship
    share_token: Mapped["ShareToken"] = relationship(
        "ShareToken", 
        back_populates="access_logs"
    )
