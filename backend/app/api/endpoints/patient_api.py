"""
Patient API Endpoints

Endpoints for patient-specific features: profile listing, claim requests.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.api.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.patient import PatientProfile
from app.models.family import FamilyMembership, RelationshipType
from app.models.hx import MedicalRecord
from app.models.profile_claim import ProfileClaimRequest, ClaimStatus
from app.schemas import clinical as clinical_schema

router = APIRouter()


def require_patient_role(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that ensures the current user is a patient."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can access this endpoint")
    return current_user


@router.get("/profiles", response_model=List[clinical_schema.PatientProfileSummary])
async def list_my_profiles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_patient_role),
):
    """List all patient profiles accessible to the current user via FamilyMembership."""
    result = await db.execute(
        select(FamilyMembership, PatientProfile)
        .join(PatientProfile, FamilyMembership.patient_profile_id == PatientProfile.id)
        .where(
            FamilyMembership.user_id == current_user.id,
            FamilyMembership.is_active == True,
        )
    )

    profiles = []
    for membership, profile in result.all():
        # Check if profile has any records
        records_result = await db.execute(
            select(func.count(MedicalRecord.id)).where(
                MedicalRecord.patient_id == profile.id
            )
        )
        record_count = records_result.scalar() or 0

        # Get doctor name if doctor-created
        doctor_name = None
        if profile.created_by_doctor_id:
            doctor_result = await db.execute(
                select(User).where(User.id == profile.created_by_doctor_id)
            )
            doctor = doctor_result.scalars().first()
            if doctor:
                doctor_name = f"{doctor.first_name or ''} {doctor.last_name or ''}".strip()

        profiles.append(clinical_schema.PatientProfileSummary(
            id=profile.id,
            first_name=profile.first_name,
            last_name=profile.last_name,
            date_of_birth=str(profile.date_of_birth) if profile.date_of_birth else None,
            relationship_type=membership.relationship_type.value,
            access_level=membership.access_level.value,
            is_self=membership.relationship_type == RelationshipType.SELF,
            has_records=record_count > 0,
            created_by_doctor_name=doctor_name,
        ))

    return profiles


@router.get("/claim-requests", response_model=List[clinical_schema.ClaimRequestSummary])
async def list_my_claim_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_patient_role),
):
    """List claim requests for the current user (pending and resolved)."""
    result = await db.execute(
        select(ProfileClaimRequest, PatientProfile)
        .join(PatientProfile, ProfileClaimRequest.patient_profile_id == PatientProfile.id)
        .where(ProfileClaimRequest.user_id == current_user.id)
        .order_by(ProfileClaimRequest.requested_at.desc())
    )

    claims = []
    for claim, profile in result.all():
        # Get the doctor who created the profile
        doctor_name = None
        if profile.created_by_doctor_id:
            doctor_result = await db.execute(
                select(User).where(User.id == profile.created_by_doctor_id)
            )
            doctor = doctor_result.scalars().first()
            if doctor:
                doctor_name = f"{doctor.first_name or ''} {doctor.last_name or ''}".strip()

        claims.append(clinical_schema.ClaimRequestSummary(
            id=claim.id,
            user_id=claim.user_id,
            patient_profile_id=claim.patient_profile_id,
            status=claim.status.value,
            requested_at=claim.requested_at,
            resolved_at=claim.resolved_at,
            patient_name=f"{profile.first_name or ''} {profile.last_name or ''}".strip(),
            patient_email=profile.email,
            requesting_user_name=f"{current_user.first_name or ''} {current_user.last_name or ''}".strip(),
            requesting_user_email=current_user.email,
            doctor_name=doctor_name,
        ))

    return claims
