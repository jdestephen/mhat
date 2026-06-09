"""Shared authorization helpers for doctor endpoints."""
import uuid
from typing import Any

from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.api import deps
from app.api.deps import get_db
from app.models.user import User, UserRole, DoctorPatientAccess, DoctorAccessLevel


async def require_doctor_role(
    current_user: User = Depends(deps.get_current_user),
) -> User:
    """Ensure current user is a doctor."""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Doctor role required")
    return current_user


async def get_doctor_patient_access(
    patient_profile_id: uuid.UUID,
    db: AsyncSession,
    current_user: User,
    require_write: bool = False,
) -> DoctorPatientAccess:
    """Get and validate doctor's access to a patient."""
    result = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.doctor_id == current_user.id,
                DoctorPatientAccess.patient_profile_id == patient_profile_id,
            )
        )
    )
    access = result.scalar_one_or_none()

    if not access:
        raise HTTPException(status_code=403, detail="No access to this patient")

    if require_write and access.access_level != DoctorAccessLevel.WRITE:
        raise HTTPException(status_code=403, detail="Write access required")

    return access
