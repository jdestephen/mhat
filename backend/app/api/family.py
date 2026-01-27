"""
Family Management API Endpoints

API routes for managing family accounts and patient profile access.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.family import AccessLevel
from app.services.family_service import FamilyService
from app.schemas.family import (
    CreateFamilyMemberRequest,
    GrantFamilyAccessRequest,
    LinkPatientToUserRequest,
    FamilyMembershipResponse,
    PatientProfileResponse,
    ManagedPatientResponse
)

router = APIRouter(prefix="/family", tags=["family"])


@router.get("/managed-patients", response_model=List[ManagedPatientResponse])
def get_managed_patients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all patient profiles that the current user can manage.
    Includes self and family members.
    """
    patients = FamilyService.get_managed_patients(db, current_user.id)
    
    # Enrich with relationship info
    result = []
    for patient in patients:
        # Find the membership for this user
        membership = next(
            (m for m in patient.managed_by if m.user_id == current_user.id and m.is_active),
            None
        )
        if membership:
            result.append({
                "id": patient.id,
                "user_id": patient.user_id,
                "first_name": patient.first_name,
                "last_name": patient.last_name,
                "date_of_birth": patient.date_of_birth,
                "blood_type": patient.blood_type,
                "relationship_type": membership.relationship_type,
                "access_level": membership.access_level,
                "can_manage_family": membership.can_manage_family
            })
    
    return result


@router.post("/members", response_model=PatientProfileResponse, status_code=status.HTTP_201_CREATED)
def create_family_member(
    request: CreateFamilyMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new patient profile for a family member (e.g., child).
    The family member will NOT have a user account (for users under 16).
    """
    try:
        patient_profile = FamilyService.create_family_member(
            db=db,
            user_id=current_user.id,
            first_name=request.first_name,
            last_name=request.last_name,
            relationship_type=request.relationship_type,
            date_of_birth=request.date_of_birth,
            blood_type=request.blood_type,
            access_level=request.access_level
        )
        return patient_profile
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/link-patient", response_model=PatientProfileResponse)
def link_patient_to_user(
    request: LinkPatientToUserRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Link an existing patient profile to the current user's account.
    This is used when a child turns 16+ and creates their own account.
    They can link their existing patient profile (created by parent) to their new account.
    """
    # Verify user has access to this patient profile first
    has_access = FamilyService.check_access(
        db=db,
        user_id=current_user.id,
        patient_profile_id=request.patient_profile_id,
        required_level=AccessLevel.FULL_ACCESS
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this patient profile"
        )
    
    try:
        patient_profile = FamilyService.link_patient_to_user(
            db=db,
            patient_profile_id=request.patient_profile_id,
            user_id=current_user.id
        )
        return patient_profile
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/patients/{patient_profile_id}/grant-access", response_model=FamilyMembershipResponse)
def grant_family_access(
    patient_profile_id: UUID,
    request: GrantFamilyAccessRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Grant another user access to a patient profile.
    Example: Mother grants father access to their child's medical records.
    """
    try:
        membership = FamilyService.add_family_member_access(
            db=db,
            granter_user_id=current_user.id,
            grantee_user_id=request.grantee_user_id,
            patient_profile_id=patient_profile_id,
            relationship_type=request.relationship_type,
            access_level=request.access_level,
            can_manage_family=request.can_manage_family
        )
        return membership
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/memberships/{membership_id}", response_model=FamilyMembershipResponse)
def revoke_family_access(
    membership_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke a user's access to a patient profile.
    Only users with can_manage_family=True can revoke access.
    Users can also revoke their own access.
    """
    try:
        membership = FamilyService.revoke_access(
            db=db,
            revoker_user_id=current_user.id,
            membership_id=membership_id
        )
        return membership
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/patients/{patient_profile_id}/members", response_model=List[FamilyMembershipResponse])
def get_patient_family_members(
    patient_profile_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all users who have access to a patient profile.
    Only users with access to the patient can view this.
    """
    # Verify user has access to this patient profile
    has_access = FamilyService.check_access(
        db=db,
        user_id=current_user.id,
        patient_profile_id=patient_profile_id,
        required_level=AccessLevel.READ_ONLY
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this patient profile"
        )
    
    memberships = FamilyService.get_family_members(
        db=db,
        patient_profile_id=patient_profile_id,
        include_inactive=False
    )
    
    return memberships
