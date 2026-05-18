"""
Family Account Schemas

Pydantic models for family account API requests and responses.
"""
from datetime import datetime, date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.family import RelationshipType, AccessLevel


# Request Schemas

class CreateFamilyMemberRequest(BaseModel):
    """Request to create a new family member (patient profile without user account)."""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    relationship_type: RelationshipType
    date_of_birth: Optional[date] = None
    blood_type: Optional[str] = Field(None, max_length=10)
    access_level: AccessLevel = AccessLevel.FULL_ACCESS
    profile_color: Optional[str] = Field(None, max_length=7, pattern=r'^#[0-9A-Fa-f]{6}$')


class GrantFamilyAccessRequest(BaseModel):
    """Request to grant another user access to a patient profile."""
    grantee_user_id: UUID
    relationship_type: RelationshipType
    access_level: AccessLevel = AccessLevel.FULL_ACCESS
    can_manage_family: bool = False


class LinkPatientToUserRequest(BaseModel):
    """Request to link an existing patient profile to a user account."""
    patient_profile_id: UUID


class UpdateMembershipRequest(BaseModel):
    """Request to update a family membership (e.g., color, access level)."""
    access_level: Optional[AccessLevel] = None
    profile_color: Optional[str] = Field(None, max_length=7, pattern=r'^#[0-9A-Fa-f]{6}$')
    can_manage_family: Optional[bool] = None


class CreateFamilyInvitationRequest(BaseModel):
    """Request to create an invitation code for another guardian."""
    relationship_type: RelationshipType
    access_level: AccessLevel = AccessLevel.FULL_ACCESS
    can_manage_family: bool = False


class ClaimFamilyInvitationRequest(BaseModel):
    """Request to claim a family invitation code."""
    code: str = Field(..., min_length=4, max_length=10)


# Response Schemas

class FamilyMembershipResponse(BaseModel):
    """Response model for family membership."""
    id: UUID
    user_id: UUID
    patient_profile_id: UUID
    relationship_type: RelationshipType
    access_level: AccessLevel
    can_manage_family: bool
    profile_color: Optional[str] = None
    created_at: datetime
    created_by: UUID
    is_active: bool
    revoked_at: Optional[datetime] = None
    revoked_by: Optional[UUID] = None
    
    class Config:
        from_attributes = True


class PatientProfileResponse(BaseModel):
    """Response model for patient profile."""
    id: UUID
    user_id: Optional[UUID] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    blood_type: Optional[str] = None
    
    class Config:
        from_attributes = True


class ManagedPatientResponse(PatientProfileResponse):
    """Response model for managed patient with relationship info."""
    relationship_type: RelationshipType
    access_level: AccessLevel
    can_manage_family: bool
    profile_color: Optional[str] = None
    
    class Config:
        from_attributes = True


class FamilyInvitationResponse(BaseModel):
    """Response model for a family invitation."""
    id: UUID
    patient_profile_id: UUID
    patient_name: Optional[str] = None
    code: str
    relationship_type: RelationshipType
    access_level: AccessLevel
    can_manage_family: bool
    code_expires_at: datetime
    claimed_by: Optional[UUID] = None
    claimed_at: Optional[datetime] = None
    is_revoked: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

