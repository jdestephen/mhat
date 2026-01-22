"""
Pydantic schemas for medical record sharing.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr


# Request schemas

class CreateShareRequest(BaseModel):
    """Request to create a new share link."""
    record_ids: List[UUID] = Field(..., min_length=1, description="List of medical record IDs to share")
    expiration_minutes: int = Field(20, ge=1, le=10080, description="Expiration time in minutes (max 7 days)")
    is_single_use: bool = Field(False, description="Whether the link can only be accessed once")
    recipient_name: Optional[str] = Field(None, max_length=200, description="Optional recipient name")
    recipient_email: Optional[EmailStr] = Field(None, description="Optional recipient email")
    purpose: Optional[str] = Field(None, max_length=500, description="Purpose of sharing (e.g., 'Cardiology consultation')")


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
    category: Optional[dict] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    status: str
    created_at: datetime
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
