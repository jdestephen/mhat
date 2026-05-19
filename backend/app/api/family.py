"""
Family Management API Endpoints

API routes for managing family accounts, patient profile access,
family invitations, and doctor patient-mode initialization.
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, resolve_patient_profile
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.patient import PatientProfile
from app.models.family import FamilyMembership, RelationshipType, AccessLevel
from app.models.family_invitation import FamilyInvitation
from app.schemas.family import (
    CreateFamilyMemberRequest,
    UpdateMembershipRequest,
    CreateFamilyInvitationRequest,
    ClaimFamilyInvitationRequest,
    FamilyMembershipResponse,
    PatientProfileResponse,
    ManagedPatientResponse,
    FamilyInvitationResponse,
)

router = APIRouter(prefix="/family", tags=["family"])


# ==========================
# Managed Patients
# ==========================

@router.get("/managed-patients", response_model=List[ManagedPatientResponse])
async def get_managed_patients(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all patient profiles that the current user can manage.
    Includes self and family members.
    """
    result = await db.execute(
        select(FamilyMembership, PatientProfile)
        .join(PatientProfile, FamilyMembership.patient_profile_id == PatientProfile.id)
        .where(
            FamilyMembership.user_id == current_user.id,
            FamilyMembership.is_active == True,
        )
        .order_by(
            # SELF first, then alphabetical
            FamilyMembership.relationship_type != RelationshipType.SELF,
            PatientProfile.first_name,
        )
    )

    results = []
    for membership, patient in result.all():
        results.append(ManagedPatientResponse(
            id=patient.id,
            user_id=patient.user_id,
            first_name=patient.first_name,
            last_name=patient.last_name,
            date_of_birth=patient.date_of_birth,
            blood_type=patient.blood_type,
            relationship_type=membership.relationship_type,
            access_level=membership.access_level,
            can_manage_family=membership.can_manage_family,
            profile_color=membership.profile_color,
        ))
    return results


# ==========================
# Create Family Member
# ==========================

@router.post("/members", response_model=PatientProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_family_member(
    request: CreateFamilyMemberRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new patient profile for a family member (e.g., child).
    The family member will NOT have a user account.
    """
    # Create patient profile without user account
    patient_profile = PatientProfile(
        user_id=None,
        first_name=request.first_name,
        last_name=request.last_name,
        date_of_birth=request.date_of_birth,
        blood_type=request.blood_type,
    )
    db.add(patient_profile)
    await db.flush()

    # Create family membership
    membership = FamilyMembership(
        user_id=current_user.id,
        patient_profile_id=patient_profile.id,
        relationship_type=request.relationship_type,
        access_level=request.access_level,
        can_manage_family=True,
        profile_color=request.profile_color,
        created_by=current_user.id,
        is_active=True,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(patient_profile)
    return patient_profile


# ==========================
# Update Membership
# ==========================

@router.patch("/memberships/{membership_id}", response_model=FamilyMembershipResponse)
async def update_membership(
    membership_id: UUID,
    request: UpdateMembershipRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a family membership (e.g., color, access level)."""
    result = await db.execute(
        select(FamilyMembership).where(
            FamilyMembership.id == membership_id,
            FamilyMembership.user_id == current_user.id,
            FamilyMembership.is_active == True,
        )
    )
    membership = result.scalars().first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(membership, field, value)

    await db.commit()
    await db.refresh(membership)
    return membership


# ==========================
# Revoke Access
# ==========================

@router.delete("/memberships/{membership_id}", response_model=FamilyMembershipResponse)
async def revoke_family_access(
    membership_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Revoke a user's access to a patient profile (soft-delete).
    Only users with can_manage_family=True or the membership owner can revoke.
    Cannot revoke SELF memberships.
    """
    result = await db.execute(
        select(FamilyMembership).where(FamilyMembership.id == membership_id)
    )
    membership = result.scalars().first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    if membership.relationship_type == RelationshipType.SELF:
        raise HTTPException(status_code=400, detail="Cannot revoke your own self membership")

    # Verify revoker has permission
    revoker_result = await db.execute(
        select(FamilyMembership).where(
            FamilyMembership.user_id == current_user.id,
            FamilyMembership.patient_profile_id == membership.patient_profile_id,
            FamilyMembership.is_active == True,
            FamilyMembership.can_manage_family == True,
        )
    )
    revoker_membership = revoker_result.scalars().first()

    if not revoker_membership and membership.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No permission to revoke this access")

    membership.is_active = False
    membership.revoked_at = datetime.now(timezone.utc)
    membership.revoked_by = current_user.id
    await db.commit()
    await db.refresh(membership)
    return membership


# ==========================
# Patient Family Members for a Profile
# ==========================

@router.get("/patients/{patient_profile_id}/members", response_model=List[FamilyMembershipResponse])
async def get_patient_family_members(
    patient_profile_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all users who have access to a patient profile."""
    # Verify caller has access
    profile = await resolve_patient_profile(db, current_user, str(patient_profile_id))

    result = await db.execute(
        select(FamilyMembership).where(
            FamilyMembership.patient_profile_id == profile.id,
            FamilyMembership.is_active == True,
        )
    )
    return result.scalars().all()


# ==========================
# Family Invitations
# ==========================

@router.post(
    "/profiles/{patient_profile_id}/invite",
    response_model=FamilyInvitationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_family_invitation(
    patient_profile_id: UUID,
    request: CreateFamilyInvitationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a family invitation code for another guardian."""
    # Verify caller can manage this profile's family
    result = await db.execute(
        select(FamilyMembership).where(
            FamilyMembership.user_id == current_user.id,
            FamilyMembership.patient_profile_id == patient_profile_id,
            FamilyMembership.is_active == True,
            FamilyMembership.can_manage_family == True,
        )
    )
    if not result.scalars().first():
        raise HTTPException(status_code=403, detail="No permission to manage family for this profile")

    # Get profile for response name
    profile_result = await db.execute(
        select(PatientProfile).where(PatientProfile.id == patient_profile_id)
    )
    profile = profile_result.scalars().first()

    invitation = FamilyInvitation(
        creator_id=current_user.id,
        patient_profile_id=patient_profile_id,
        relationship_type=request.relationship_type,
        access_level=request.access_level,
        can_manage_family=request.can_manage_family,
        code_expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)

    return FamilyInvitationResponse(
        id=invitation.id,
        patient_profile_id=invitation.patient_profile_id,
        patient_name=f"{profile.first_name or ''} {profile.last_name or ''}".strip() if profile else None,
        code=invitation.code,
        relationship_type=invitation.relationship_type,
        access_level=invitation.access_level,
        can_manage_family=invitation.can_manage_family,
        code_expires_at=invitation.code_expires_at,
        claimed_by=invitation.claimed_by,
        claimed_at=invitation.claimed_at,
        is_revoked=invitation.is_revoked,
        created_at=invitation.created_at,
    )


@router.post("/invite/claim", response_model=ManagedPatientResponse)
async def claim_family_invitation(
    request: ClaimFamilyInvitationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Claim a family invitation code to gain access to a patient profile."""
    code = request.code.strip().upper()

    result = await db.execute(
        select(FamilyInvitation).where(FamilyInvitation.code == code)
    )
    invitation = result.scalars().first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Código de invitación no encontrado")
    if invitation.is_revoked:
        raise HTTPException(status_code=400, detail="Esta invitación fue revocada")
    if invitation.claimed_by:
        raise HTTPException(status_code=400, detail="Esta invitación ya fue utilizada")
    if invitation.code_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Esta invitación ha expirado")
    if invitation.creator_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes reclamar tu propia invitación")

    # Check if user already has active access to this profile
    existing = await db.execute(
        select(FamilyMembership).where(
            FamilyMembership.user_id == current_user.id,
            FamilyMembership.patient_profile_id == invitation.patient_profile_id,
            FamilyMembership.is_active == True,
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Ya tienes acceso a este perfil")

    # Create membership
    membership = FamilyMembership(
        user_id=current_user.id,
        patient_profile_id=invitation.patient_profile_id,
        relationship_type=invitation.relationship_type,
        access_level=invitation.access_level,
        can_manage_family=invitation.can_manage_family,
        created_by=invitation.creator_id,
        is_active=True,
    )
    db.add(membership)

    # Mark invitation as claimed
    invitation.claimed_by = current_user.id
    invitation.claimed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(membership)

    # Get profile for response
    profile_result = await db.execute(
        select(PatientProfile).where(PatientProfile.id == invitation.patient_profile_id)
    )
    patient = profile_result.scalars().first()

    return ManagedPatientResponse(
        id=patient.id,
        user_id=patient.user_id,
        first_name=patient.first_name,
        last_name=patient.last_name,
        date_of_birth=patient.date_of_birth,
        blood_type=patient.blood_type,
        relationship_type=membership.relationship_type,
        access_level=membership.access_level,
        can_manage_family=membership.can_manage_family,
        profile_color=membership.profile_color,
    )


@router.get("/invitations/{patient_profile_id}", response_model=List[FamilyInvitationResponse])
async def list_family_invitations(
    patient_profile_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all family invitations for a patient profile."""
    profile = await resolve_patient_profile(db, current_user, str(patient_profile_id))

    result = await db.execute(
        select(FamilyInvitation)
        .where(FamilyInvitation.patient_profile_id == profile.id)
        .order_by(FamilyInvitation.created_at.desc())
    )
    invitations = result.scalars().all()

    responses = []
    for inv in invitations:
        responses.append(FamilyInvitationResponse(
            id=inv.id,
            patient_profile_id=inv.patient_profile_id,
            patient_name=f"{profile.first_name or ''} {profile.last_name or ''}".strip(),
            code=inv.code,
            relationship_type=inv.relationship_type,
            access_level=inv.access_level,
            can_manage_family=inv.can_manage_family,
            code_expires_at=inv.code_expires_at,
            claimed_by=inv.claimed_by,
            claimed_at=inv.claimed_at,
            is_revoked=inv.is_revoked,
            created_at=inv.created_at,
        ))
    return responses


@router.delete("/invitations/{invitation_id}/revoke")
async def revoke_family_invitation(
    invitation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an unclaimed family invitation."""
    result = await db.execute(
        select(FamilyInvitation).where(FamilyInvitation.id == invitation_id)
    )
    invitation = result.scalars().first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can revoke this invitation")

    if invitation.claimed_by:
        raise HTTPException(status_code=400, detail="Cannot revoke a claimed invitation")

    invitation.is_revoked = True
    await db.commit()
    return {"message": "Invitation revoked"}


# ==========================
# Doctor Patient-Mode Init
# ==========================

@router.post("/doctor-patient-init", response_model=PatientProfileResponse)
async def doctor_patient_init(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initialize a patient profile for a doctor user.
    Creates a PatientProfile + SELF FamilyMembership if none exists.
    Idempotent — returns existing profile if already initialized.
    """
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can use this endpoint")

    # Check if a patient profile already exists for this user
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    )
    existing = result.scalars().first()
    if existing:
        return existing

    # Create patient profile
    profile = PatientProfile(
        user_id=current_user.id,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
    )
    db.add(profile)
    await db.flush()

    # Create SELF membership
    membership = FamilyMembership(
        user_id=current_user.id,
        patient_profile_id=profile.id,
        relationship_type=RelationshipType.SELF,
        access_level=AccessLevel.FULL_ACCESS,
        can_manage_family=True,
        created_by=current_user.id,
        is_active=True,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(profile)
    return profile
