"""Vital signs management for doctor workflow."""
import uuid
from datetime import datetime, timezone, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.api.deps import get_db
from app.models.user import User, UserRole
from app.models.hx import MedicalRecord, VitalSigns, VitalSignsStatus
from app.schemas import hx as hx_schema

from ._helpers import require_doctor_role, get_doctor_patient_access

router = APIRouter()


@router.get("/patients/{patient_profile_id}/vital-signs", response_model=List[hx_schema.VitalSignsResponse])
async def list_patient_vital_signs(
    patient_profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """List all vital signs for a patient (descending)."""
    await get_doctor_patient_access(patient_profile_id, db, current_user)

    stmt = (
        select(VitalSigns)
        .filter(VitalSigns.patient_id == patient_profile_id)
        .order_by(VitalSigns.measured_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/patients/{patient_profile_id}/records/{record_id}/vital-signs", response_model=hx_schema.VitalSignsResponse)
async def create_record_vital_signs(
    patient_profile_id: uuid.UUID,
    record_id: uuid.UUID,
    vital_in: hx_schema.VitalSignsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Create vital signs linked to a medical record."""
    await get_doctor_patient_access(patient_profile_id, db, current_user, require_write=True)

    result = await db.execute(
        select(MedicalRecord).where(
            and_(MedicalRecord.id == record_id, MedicalRecord.patient_id == patient_profile_id)
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")

    vital = VitalSigns(
        patient_id=patient_profile_id,
        medical_record_id=record_id,
        created_by=current_user.id,
        **vital_in.model_dump(exclude_none=True),
    )
    db.add(vital)
    await db.commit()
    await db.refresh(vital)
    return vital


@router.post("/patients/{patient_profile_id}/vital-signs", response_model=hx_schema.VitalSignsResponse)
async def create_standalone_vital_signs(
    patient_profile_id: uuid.UUID,
    vital_in: hx_schema.VitalSignsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Create standalone vital signs (not tied to a record). Status = VERIFIED."""
    await get_doctor_patient_access(patient_profile_id, db, current_user, require_write=True)

    vital = VitalSigns(
        patient_id=patient_profile_id,
        created_by=current_user.id,
        status=VitalSignsStatus.VERIFIED,
        **vital_in.model_dump(exclude_none=True),
    )
    db.add(vital)
    await db.commit()
    await db.refresh(vital)
    return vital


@router.put("/patients/{patient_profile_id}/vital-signs/{vital_id}", response_model=hx_schema.VitalSignsResponse)
async def update_vital_signs(
    patient_profile_id: uuid.UUID,
    vital_id: uuid.UUID,
    vital_in: hx_schema.VitalSignsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Update vital signs. Doctor can edit if they created it, or if patient created it."""
    await get_doctor_patient_access(patient_profile_id, db, current_user, require_write=True)

    result = await db.execute(
        select(VitalSigns).where(
            VitalSigns.id == vital_id,
            VitalSigns.patient_id == patient_profile_id,
        )
    )
    vital = result.scalar_one_or_none()
    if not vital:
        raise HTTPException(status_code=404, detail="Vital signs not found")

    creator_result = await db.execute(select(User).where(User.id == vital.created_by))
    creator = creator_result.scalar_one_or_none()

    if creator and creator.role == UserRole.DOCTOR and vital.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creating doctor can edit these vital signs")

    if vital.updated_by and vital.updated_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the last updating doctor can edit these vital signs")

    update_data = vital_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vital, key, value)
    vital.updated_by = current_user.id
    vital.updated_at = datetime.now(timezone.utc)
    vital.status = VitalSignsStatus.VERIFIED

    await db.commit()
    await db.refresh(vital)
    return vital


@router.get("/patients/{patient_profile_id}/vital-signs/recent", response_model=hx_schema.VitalSignsResponse | None)
async def get_recent_vital_signs(
    patient_profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Get the most recent vital signs taken within the last 3 hours."""
    await get_doctor_patient_access(patient_profile_id, db, current_user)

    three_hours_ago = datetime.now(timezone.utc) - timedelta(hours=3)

    result = await db.execute(
        select(VitalSigns)
        .where(
            VitalSigns.patient_id == patient_profile_id,
            VitalSigns.measured_at > three_hours_ago,
        )
        .order_by(VitalSigns.measured_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
