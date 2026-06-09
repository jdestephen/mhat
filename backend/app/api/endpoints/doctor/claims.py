"""Profile claim request management for doctor-created patients."""
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_db
from app.models.user import User
from app.models.patient import PatientProfile
from app.schemas import clinical as clinical_schema

from ._helpers import require_doctor_role

router = APIRouter()


@router.get("/claim-requests", response_model=List[clinical_schema.ClaimRequestSummary])
async def list_claim_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """List pending profile claim requests for profiles this doctor created."""
    from app.models.profile_claim import ProfileClaimRequest, ClaimStatus

    result = await db.execute(
        select(ProfileClaimRequest, PatientProfile, User)
        .join(PatientProfile, ProfileClaimRequest.patient_profile_id == PatientProfile.id)
        .join(User, ProfileClaimRequest.user_id == User.id)
        .where(
            PatientProfile.created_by_doctor_id == current_user.id,
            ProfileClaimRequest.status == ClaimStatus.PENDING,
        )
    )

    claims = []
    for claim, profile, requesting_user in result.all():
        claims.append(clinical_schema.ClaimRequestSummary(
            id=claim.id,
            user_id=claim.user_id,
            patient_profile_id=claim.patient_profile_id,
            status=claim.status.value,
            requested_at=claim.requested_at,
            resolved_at=claim.resolved_at,
            patient_name=f"{profile.first_name or ''} {profile.last_name or ''}".strip(),
            patient_email=profile.email,
            requesting_user_name=f"{requesting_user.first_name or ''} {requesting_user.last_name or ''}".strip(),
            requesting_user_email=requesting_user.email,
            doctor_name=f"{current_user.first_name or ''} {current_user.last_name or ''}".strip(),
        ))

    return claims


@router.post("/claim-requests/{claim_id}/approve")
async def approve_claim_request(
    claim_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Approve a claim request. Links the doctor-created profile to the requesting user.

    Smart merge logic:
    - If patient's self-profile is empty → replace it with the claimed profile
    - If patient has their own data → add claimed profile as additional FamilyMembership
    """
    from app.models.profile_claim import ProfileClaimRequest, ClaimStatus
    from app.models.family import FamilyMembership, RelationshipType, AccessLevel

    claim_uuid = uuid.UUID(claim_id)

    result = await db.execute(
        select(ProfileClaimRequest, PatientProfile)
        .join(PatientProfile, ProfileClaimRequest.patient_profile_id == PatientProfile.id)
        .where(
            ProfileClaimRequest.id == claim_uuid,
            PatientProfile.created_by_doctor_id == current_user.id,
            ProfileClaimRequest.status == ClaimStatus.PENDING,
        )
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Claim request not found or already resolved")

    claim, claimed_profile = row

    self_profile_result = await db.execute(
        select(FamilyMembership)
        .where(
            FamilyMembership.user_id == claim.user_id,
            FamilyMembership.relationship_type == RelationshipType.SELF,
            FamilyMembership.is_active == True,
        )
    )
    self_membership = self_profile_result.scalars().first()

    if self_membership:
        from app.models.hx import MedicalRecord, VitalSigns
        records_count = await db.execute(
            select(MedicalRecord.id).where(
                MedicalRecord.patient_id == self_membership.patient_profile_id
            ).limit(1)
        )
        vitals_count = await db.execute(
            select(VitalSigns.id).where(
                VitalSigns.patient_id == self_membership.patient_profile_id
            ).limit(1)
        )
        self_profile_empty = (
            records_count.first() is None and vitals_count.first() is None
        )

        if self_profile_empty:
            old_profile_id = self_membership.patient_profile_id
            claimed_profile.user_id = claim.user_id
            self_membership.patient_profile_id = claimed_profile.id
            old_profile = await db.get(PatientProfile, old_profile_id)
            if old_profile:
                await db.delete(old_profile)
        else:
            claimed_profile.user_id = claim.user_id
            new_membership = FamilyMembership(
                user_id=claim.user_id,
                patient_profile_id=claimed_profile.id,
                relationship_type=RelationshipType.OTHER,
                access_level=AccessLevel.FULL_ACCESS,
                can_manage_family=False,
                created_by=current_user.id,
                is_active=True,
            )
            db.add(new_membership)
    else:
        claimed_profile.user_id = claim.user_id

    claim.status = ClaimStatus.APPROVED
    claim.resolved_at = datetime.now(timezone.utc)
    claim.resolved_by = current_user.id

    await db.commit()
    return {"message": "Solicitud de vinculación aprobada exitosamente"}


@router.post("/claim-requests/{claim_id}/reject")
async def reject_claim_request(
    claim_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Reject a claim request."""
    from app.models.profile_claim import ProfileClaimRequest, ClaimStatus

    claim_uuid = uuid.UUID(claim_id)

    result = await db.execute(
        select(ProfileClaimRequest, PatientProfile)
        .join(PatientProfile, ProfileClaimRequest.patient_profile_id == PatientProfile.id)
        .where(
            ProfileClaimRequest.id == claim_uuid,
            PatientProfile.created_by_doctor_id == current_user.id,
            ProfileClaimRequest.status == ClaimStatus.PENDING,
        )
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Claim request not found or already resolved")

    claim, _ = row
    claim.status = ClaimStatus.REJECTED
    claim.resolved_at = datetime.now(timezone.utc)
    claim.resolved_by = current_user.id

    await db.commit()
    return {"message": "Solicitud de vinculación rechazada"}
