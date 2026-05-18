"""
Doctor Access Management Endpoints (Patient Side)

Endpoints for patients to manage doctor access to their records,
including invitations, access grants, and revocations.

All endpoints are profile-aware, scoping to the active patient profile
(own or managed family member).
"""
from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.api.deps import get_current_user, resolve_patient_profile
from app.db.session import get_db
from app.models.user import User, UserRole, DoctorPatientAccess, DoctorAccessLevel, AccessType as UserAccessType
from app.models.patient import PatientProfile
from app.models.doctor import DoctorProfile
from app.models.access_invitation import AccessInvitation
from app.schemas import clinical as clinical_schema

router = APIRouter()


class DoctorAccessInfo(BaseModel):
    """Information about a doctor with access to patient records."""
    doctor_id: str
    doctor_name: str
    specialty: str | None = None
    access_level: str
    granted_at: datetime

    class Config:
        from_attributes = True


# ==========================
# Doctor Access
# ==========================

@router.get("/me/doctor-access", response_model=List[DoctorAccessInfo])
async def list_doctors_with_access(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None, description="Target patient profile ID"),
):
    """List all doctors who have access to the patient's records."""
    profile = await resolve_patient_profile(db, current_user, profile_id)

    result = await db.execute(
        select(DoctorPatientAccess, User, DoctorProfile)
        .join(User, DoctorPatientAccess.doctor_id == User.id)
        .join(DoctorProfile, DoctorProfile.user_id == User.id, isouter=True)
        .where(DoctorPatientAccess.patient_profile_id == profile.id)
    )

    doctors = []
    for access, user, doctor_profile in result.all():
        doctors.append(DoctorAccessInfo(
            doctor_id=str(access.doctor_id),
            doctor_name=f"{user.first_name} {user.last_name}",
            specialty=doctor_profile.specialty if doctor_profile else None,
            access_level=access.access_level.value,
            granted_at=access.created_at,
        ))
    return doctors


@router.post("/me/doctor-access")
async def grant_doctor_access(
    doctor_id: str,
    access_level: str = "READ_ONLY",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Grant a doctor access to the patient's records."""
    profile = await resolve_patient_profile(db, current_user, profile_id)

    import uuid as uuid_module
    try:
        doctor_uuid = uuid_module.UUID(doctor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")

    # Verify doctor exists
    result = await db.execute(
        select(User).where(and_(User.id == doctor_uuid, User.role == UserRole.DOCTOR))
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Check if access already exists
    result = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.doctor_id == doctor_uuid,
                DoctorPatientAccess.patient_profile_id == profile.id,
            )
        )
    )
    existing = result.scalar_one_or_none()

    level = DoctorAccessLevel.WRITE if access_level == "WRITE" else DoctorAccessLevel.READ_ONLY

    if existing:
        existing.access_level = level
        existing.granted_by = current_user.id
        await db.commit()
        return {"message": "Access updated", "access_level": level.value}

    access = DoctorPatientAccess(
        doctor_id=doctor_uuid,
        patient_profile_id=profile.id,
        access_level=level,
        granted_by=current_user.id,
    )
    db.add(access)
    await db.commit()
    return {"message": "Access granted", "access_level": level.value}


@router.delete("/me/doctor-access/{doctor_id}")
async def revoke_doctor_access(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Revoke a doctor's access to the patient's records."""
    profile = await resolve_patient_profile(db, current_user, profile_id)

    import uuid as uuid_module
    try:
        doctor_uuid = uuid_module.UUID(doctor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")

    result = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.doctor_id == doctor_uuid,
                DoctorPatientAccess.patient_profile_id == profile.id,
            )
        )
    )
    access = result.scalar_one_or_none()
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")

    await db.delete(access)
    await db.commit()
    return {"message": "Access revoked"}


# ==========================
# Access Invitations
# ==========================

@router.post("/me/invitations", response_model=clinical_schema.AccessInvitationResponse)
async def create_invitation(
    invitation_in: clinical_schema.AccessInvitationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Create an invitation code for a doctor to claim access. Valid for 24h."""
    profile = await resolve_patient_profile(db, current_user, profile_id)

    if invitation_in.access_type == "TEMPORARY" and not invitation_in.expires_in_days:
        raise HTTPException(status_code=400, detail="expires_in_days is required for temporary access")

    access_type = UserAccessType.TEMPORARY if invitation_in.access_type == "TEMPORARY" else UserAccessType.PERMANENT

    invitation = AccessInvitation(
        patient_profile_id=profile.id,
        created_by=current_user.id,
        access_level=invitation_in.access_level,
        access_type=access_type,
        expires_in_days=invitation_in.expires_in_days if invitation_in.access_type == "TEMPORARY" else None,
        code_expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)
    return invitation


@router.get("/me/invitations", response_model=List[clinical_schema.AccessInvitationResponse])
async def list_my_invitations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """List all invitations created by the patient for a profile."""
    profile = await resolve_patient_profile(db, current_user, profile_id)

    result = await db.execute(
        select(AccessInvitation)
        .where(AccessInvitation.patient_profile_id == profile.id)
        .order_by(AccessInvitation.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/me/invitations/{invitation_id}")
async def revoke_invitation(
    invitation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Revoke an unclaimed invitation."""
    profile = await resolve_patient_profile(db, current_user, profile_id)

    import uuid as uuid_module
    try:
        inv_uuid = uuid_module.UUID(invitation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid invitation ID")

    result = await db.execute(
        select(AccessInvitation).where(AccessInvitation.id == inv_uuid)
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.patient_profile_id != profile.id:
        raise HTTPException(status_code=403, detail="Not your invitation")

    if invitation.claimed_by:
        raise HTTPException(status_code=400, detail="Cannot revoke a claimed invitation")

    invitation.is_revoked = True
    await db.commit()
    return {"message": "Invitation revoked"}


@router.get("/me/doctors", response_model=List[clinical_schema.DoctorAccessInfo])
async def list_my_doctors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """List all doctors with access to the patient's records."""
    profile = await resolve_patient_profile(db, current_user, profile_id)

    result = await db.execute(
        select(DoctorPatientAccess, User, DoctorProfile)
        .join(User, DoctorPatientAccess.doctor_id == User.id)
        .join(DoctorProfile, DoctorProfile.user_id == User.id, isouter=True)
        .where(DoctorPatientAccess.patient_profile_id == profile.id)
    )

    doctors = []
    for access, user, doctor_profile in result.all():
        doctors.append(clinical_schema.DoctorAccessInfo(
            access_id=access.id,
            doctor_id=access.doctor_id,
            doctor_name=f"{user.first_name or ''} {user.last_name or ''}" .strip() or "Doctor",
            specialty=doctor_profile.specialty if doctor_profile and hasattr(doctor_profile, 'specialty') else None,
            access_level=access.access_level.value,
            access_type=access.access_type.value if hasattr(access, 'access_type') else "PERMANENT",
            granted_at=access.created_at,
        ))
    return doctors


@router.delete("/me/doctors/{access_id}")
async def revoke_doctor_access_by_id(
    access_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Revoke a specific doctor's access to the patient's records."""
    profile = await resolve_patient_profile(db, current_user, profile_id)

    import uuid as uuid_module
    try:
        access_uuid = uuid_module.UUID(access_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid access ID")

    result = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.id == access_uuid,
                DoctorPatientAccess.patient_profile_id == profile.id,
            )
        )
    )
    access = result.scalar_one_or_none()
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")

    await db.delete(access)
    await db.commit()
    return {"message": "Doctor access revoked"}
