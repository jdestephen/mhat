"""
Schemas for Health Center operations.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel

from app.models.organization import HealthCenterType, HealthCenterVerificationStatus


# =====================
# Request schemas
# =====================

class HealthCenterCreate(BaseModel):
    """Schema for creating a new health center."""
    name: str
    type: HealthCenterType = HealthCenterType.CLINIC
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    tax_id: Optional[str] = None


class HealthCenterUpdate(BaseModel):
    """Schema for updating a health center."""
    name: Optional[str] = None
    type: Optional[HealthCenterType] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    tax_id: Optional[str] = None


class HealthCenterReject(BaseModel):
    """Schema for rejecting a health center."""
    reason: str
    suggested_health_center_id: Optional[UUID] = None


# =====================
# Response schemas
# =====================

class HealthCenterResponse(BaseModel):
    """Public-facing health center information."""
    id: UUID
    name: str
    type: HealthCenterType
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    logo_key: Optional[str] = None
    tax_id: Optional[str] = None
    is_active: bool
    verification_status: HealthCenterVerificationStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class HealthCenterDetailResponse(HealthCenterResponse):
    """Extended HC response for admin views with verification info."""
    verified_by: Optional[UUID] = None
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    suggested_health_center_id: Optional[UUID] = None
    suggested_health_center_name: Optional[str] = None
    created_by_id: Optional[UUID] = None
    created_by_name: Optional[str] = None


class HealthCenterMembershipResponse(BaseModel):
    """HC membership info for a user."""
    id: UUID
    health_center_id: UUID
    health_center_name: str
    health_center_type: HealthCenterType
    role: str
    specialty: Optional[str] = None
    is_primary: bool
    verification_status: HealthCenterVerificationStatus

    model_config = {"from_attributes": True}
