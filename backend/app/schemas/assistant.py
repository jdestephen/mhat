"""
Schemas for Assistant operations.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.models.assistant import AssistantPermission


# =====================
# Request schemas
# =====================

class AssistantInviteRequest(BaseModel):
    """Schema for inviting a new assistant."""
    email: EmailStr
    first_name: str
    last_name: str
    health_center_id: UUID
    permissions: List[AssistantPermission]


class AssistantActivateRequest(BaseModel):
    """Schema for activating an assistant account via invitation token."""
    token: str
    password: str


class AssistantPermissionsUpdate(BaseModel):
    """Schema for updating assistant permissions."""
    permissions: List[AssistantPermission]


# =====================
# Response schemas
# =====================

class AssistantAssignmentResponse(BaseModel):
    """Response for a doctor-assistant assignment."""
    id: UUID
    doctor_id: UUID
    assistant_id: UUID
    assistant_email: str
    assistant_first_name: Optional[str] = None
    assistant_last_name: Optional[str] = None
    health_center_id: UUID
    health_center_name: str
    permissions: List[str]
    is_active: bool
    created_at: datetime
    deactivated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AssistantInvitationResponse(BaseModel):
    """Response for an assistant invitation."""
    id: UUID
    doctor_id: UUID
    health_center_id: UUID
    health_center_name: str
    email: str
    first_name: str
    last_name: str
    permissions: List[str]
    expires_at: datetime
    claimed_at: Optional[datetime] = None
    is_revoked: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AssistantDoctorInfo(BaseModel):
    """Info about a doctor assignment, from the assistant's perspective."""
    assignment_id: UUID
    doctor_id: UUID
    doctor_first_name: Optional[str] = None
    doctor_last_name: Optional[str] = None
    health_center_id: UUID
    health_center_name: str
    permissions: List[str]
    is_active: bool

    model_config = {"from_attributes": True}
