"""
Pydantic schemas for medical record sharing.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr, field_validator

from app.models.sharing import ShareType


# Request schemas

class CreateShareRequest(BaseModel):
    """Request to create a new share link."""
    share_type: ShareType = Field(
        default=ShareType.SPECIFIC_RECORDS, 
        description="Type of share: SPECIFIC_RECORDS or SUMMARY"
    )
    record_ids: Optional[List[UUID]] = Field(
        None, 
        description="List of medical record IDs to share (required for SPECIFIC_RECORDS)"
    )
    expiration_minutes: int = Field(20, ge=1, le=10080, description="Expiration time in minutes (max 7 days)")
    is_single_use: bool = Field(False, description="Whether the link can only be accessed once")
    recipient_name: Optional[str] = Field(None, max_length=200, description="Optional recipient name")
    recipient_email: Optional[EmailStr] = Field(None, description="Optional recipient email")
    purpose: Optional[str] = Field(None, max_length=500, description="Purpose of sharing (e.g., 'Cardiology consultation')")
    
    @field_validator('record_ids')
    @classmethod
    def validate_record_ids(cls, v, info):
        """Ensure record_ids is provided for SPECIFIC_RECORDS share type."""
        share_type = info.data.get('share_type')
        if share_type == ShareType.SPECIFIC_RECORDS:
            if not v or len(v) == 0:
                raise ValueError('record_ids is required for SPECIFIC_RECORDS share type')
        return v



# Response schemas

class ShareTokenResponse(BaseModel):
    """Response when creating a share link."""
    share_url: str = Field(..., description="Full shareable URL")
    token: str = Field(..., description="The share token")
    expires_at: datetime = Field(..., description="When the link expires")
    record_count: int = Field(..., description="Number of records shared")
    expiration_minutes: int = Field(..., description="Expiration time in minutes")
    
    class Config:
        from_attributes = True


class ShareTokenInfo(BaseModel):
    """Information about a share token (for listing)."""
    id: UUID
    token: str
    created_at: datetime
    expires_at: datetime
    is_expired: bool
    is_revoked: bool
    is_single_use: bool
    record_count: int
    access_count: int
    share_type: str = "SPECIFIC_RECORDS"  # Default for backward compatibility
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    purpose: Optional[str] = None
    
    class Config:
        from_attributes = True


class ShareTokenListResponse(BaseModel):
    """Response for listing share tokens."""
    shares: List[ShareTokenInfo]


class RevokeShareResponse(BaseModel):
    """Response when revoking a share link."""
    message: str
    token_id: UUID


# Public viewer schemas

class SharedRecordResponse(BaseModel):
    """Individual medical record in shared view."""
    id: UUID
    motive: str
    diagnosis: Optional[str] = None
    diagnoses: List[dict] = []
    category: Optional[dict] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    status: str
    brief_history: Optional[str] = None
    red_flags: Optional[List[str]] = None
    key_finding: Optional[str] = None
    actions_today: Optional[List[str]] = None
    plan_bullets: Optional[List[str]] = None
    follow_up_interval: Optional[str] = None
    follow_up_with: Optional[str] = None
    patient_instructions: Optional[str] = None
    prescriptions: List[dict] = []
    clinical_orders: List[dict] = []
    created_at: datetime
    verified_at: Optional[datetime] = None
    documents: List[dict] = []
    
    class Config:
        from_attributes = True


class SharedRecordsViewResponse(BaseModel):
    """Response for public shared records view."""
    records: List[SharedRecordResponse]
    shared_by: str = Field(..., description="Name of person who shared")
    expires_at: datetime
    purpose: Optional[str] = None
    is_expired: bool
    access_count: int


# Summary view schemas

class PatientInfoSummary(BaseModel):
    """Patient demographic information for summary view."""
    full_name: str
    date_of_birth: Optional[datetime] = None
    age_years: Optional[int] = None
    age_months: Optional[int] = None
    age_display: str
    sex: Optional[str] = None


class MedicationSummary(BaseModel):
    """Active medication summary."""
    id: str
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    start_date: Optional[datetime] = None


class ConditionSummary(BaseModel):
    """Active condition summary."""
    id: str
    name: str
    diagnosed_date: Optional[datetime] = None
    severity: Optional[str] = None


class AllergySummary(BaseModel):
    """Active allergy summary."""
    id: str
    allergen: str
    reaction: Optional[str] = None
    severity: Optional[str] = None


class RecentRecordSummary(BaseModel):
    """Recent medical record summary used in shared summary view."""
    id: UUID
    motive: str
    diagnoses: List[dict] = []
    category: Optional[dict] = None
    status: str
    red_flags: Optional[List[str]] = None
    key_finding: Optional[str] = None
    documents: List[dict] = []
    created_at: datetime


class MedicalHistorySummaryResponse(BaseModel):
    """Response for medical history summary view."""
    patient_info: PatientInfoSummary
    active_medications: List[MedicationSummary]
    conditions: List[ConditionSummary]
    allergies: List[AllergySummary]
    recent_records: List[RecentRecordSummary]
    shared_by: str
    expires_at: datetime
    purpose: Optional[str] = None
    is_expired: bool
    access_count: int

