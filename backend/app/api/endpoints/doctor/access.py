"""Access management: claim invitation codes, grant/revoke patient access."""
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.api.deps import get_db
from app.models.user import User, DoctorPatientAccess, DoctorAccessLevel
from app.models.patient import PatientProfile
from app.schemas import clinical as clinical_schema

from ._helpers import require_doctor_role, get_doctor_patient_access

router = APIRouter()


@router.post("/claim-access")
async def claim_invitation_code(
    claim_in: clinical_schema.ClaimInvitationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Claim an invitation code to get access to a patient's records.
    The code must be valid (not expired, not revoked, not already claimed).
    """
    from app.models.access_invitation import AccessInvitation

    code = claim_in.code.strip().upper()

    result = await db.execute(
        select(AccessInvitation).where(AccessInvitation.code == code)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=404, detail="Código de invitación no encontrado")

    if invitation.is_revoked:
        raise HTTPException(status_code=400, detail="Esta invitación fue revocada")

    if invitation.claimed_by:
        raise HTTPException(status_code=400, detail="Esta invitación ya fue utilizada")

    if invitation.code_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Esta invitación ha expirado")

    existing = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.doctor_id == current_user.id,
                DoctorPatientAccess.patient_profile_id == invitation.patient_profile_id
            )
        )
    )
    existing_access = existing.scalar_one_or_none()

    if existing_access:
        existing_access.access_level = invitation.access_level
        existing_access.access_type = invitation.access_type
    else:
        access = DoctorPatientAccess(
            doctor_id=current_user.id,
            patient_profile_id=invitation.patient_profile_id,
            access_level=invitation.access_level,
            access_type=invitation.access_type,
            granted_by=invitation.created_by,
        )
        db.add(access)

    invitation.claimed_by = current_user.id
    invitation.claimed_at = datetime.now(timezone.utc)

    await db.commit()

    result = await db.execute(
        select(PatientProfile, User)
        .join(User, PatientProfile.user_id == User.id, isouter=True)
        .where(PatientProfile.id == invitation.patient_profile_id)
    )
    row = result.first()
    if row:
        profile, user = row
        return {
            "message": "Acceso concedido exitosamente",
            "patient_name": f"{user.first_name or ''} {user.last_name or ''}".strip() if user else f"{profile.first_name or ''} {profile.last_name or ''}".strip(),
            "access_level": invitation.access_level.value,
            "access_type": invitation.access_type.value,
        }

    return {"message": "Acceso concedido exitosamente"}


@router.post("/patients/{patient_profile_id}/access", response_model=clinical_schema.DoctorPatientAccessResponse)
async def grant_patient_access(
    patient_profile_id: uuid.UUID,
    access_level: DoctorAccessLevel = DoctorAccessLevel.WRITE,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Grant doctor access to a patient's records."""
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.id == patient_profile_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    result = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.doctor_id == current_user.id,
                DoctorPatientAccess.patient_profile_id == patient_profile_id
            )
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.access_level = access_level
        await db.commit()
        await db.refresh(existing)
        return existing

    access = DoctorPatientAccess(
        doctor_id=current_user.id,
        patient_profile_id=patient_profile_id,
        access_level=access_level,
        granted_by=current_user.id,
    )
    db.add(access)
    await db.commit()
    await db.refresh(access)

    return access


@router.delete("/patients/{patient_profile_id}/access")
async def revoke_patient_access(
    patient_profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Revoke doctor's access to a patient's records."""
    result = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.doctor_id == current_user.id,
                DoctorPatientAccess.patient_profile_id == patient_profile_id
            )
        )
    )
    access = result.scalar_one_or_none()

    if not access:
        raise HTTPException(status_code=404, detail="Access not found")

    await db.delete(access)
    await db.commit()

    return {"message": "Access revoked"}
