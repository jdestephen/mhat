"""Shared authorization helpers for doctor and assistant endpoints."""
import uuid
from typing import Any, Optional, List

from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.api import deps
from app.api.deps import get_db
from app.models.user import User, UserRole, DoctorPatientAccess, DoctorAccessLevel
from app.models.assistant import DoctorAssistantAssignment, AssistantPermission


async def require_doctor_role(
    current_user: User = Depends(deps.get_current_user),
) -> User:
    """Ensure current user is a doctor."""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Doctor role required")
    return current_user


async def require_clinical_role(
    current_user: User = Depends(deps.get_current_user),
) -> User:
    """Ensure current user is a doctor or assistant (clinical staff)."""
    if current_user.role not in (UserRole.DOCTOR, UserRole.ASSISTANT):
        raise HTTPException(status_code=403, detail="Se requiere rol médico o de asistente.")
    return current_user


async def get_assistant_assignments(
    db: AsyncSession,
    assistant_id: uuid.UUID,
    doctor_id: Optional[uuid.UUID] = None,
) -> List[DoctorAssistantAssignment]:
    """Get active assignments for an assistant, optionally filtered by doctor."""
    query = select(DoctorAssistantAssignment).where(
        DoctorAssistantAssignment.assistant_id == assistant_id,
        DoctorAssistantAssignment.is_active == True,
    )
    if doctor_id:
        query = query.where(DoctorAssistantAssignment.doctor_id == doctor_id)

    result = await db.execute(query)
    return list(result.scalars().all())


async def check_assistant_permission(
    db: AsyncSession,
    current_user: User,
    required_permission: AssistantPermission,
    doctor_id: Optional[uuid.UUID] = None,
) -> None:
    """
    Validate that an assistant has a specific permission.
    Doctors always pass — only assistants are checked.

    For RECORDS_READ/WRITE, also grants access to prescriptions, orders, and documents.
    """
    if current_user.role == UserRole.DOCTOR:
        return  # Doctors have all permissions

    if current_user.role != UserRole.ASSISTANT:
        raise HTTPException(status_code=403, detail="Rol no autorizado.")

    assignments = await get_assistant_assignments(db, current_user.id, doctor_id)
    if not assignments:
        raise HTTPException(status_code=403, detail="No tienes asignación activa como asistente.")

    # Collect all permissions across assignments
    all_permissions: set[str] = set()
    for assignment in assignments:
        all_permissions.update(assignment.permissions)

    # RECORDS_READ/WRITE imply DOCUMENTS_READ/WRITE
    if AssistantPermission.RECORDS_READ.value in all_permissions:
        all_permissions.add(AssistantPermission.DOCUMENTS_READ.value)
    if AssistantPermission.RECORDS_WRITE.value in all_permissions:
        all_permissions.add(AssistantPermission.DOCUMENTS_WRITE.value)

    if required_permission.value not in all_permissions:
        raise HTTPException(
            status_code=403,
            detail=f"No tienes permiso: {required_permission.value}",
        )


async def get_doctor_patient_access(
    patient_profile_id: uuid.UUID,
    db: AsyncSession,
    current_user: User,
    require_write: bool = False,
) -> DoctorPatientAccess:
    """
    Get and validate doctor's access to a patient.
    For assistants, checks access via their assigned doctor(s).
    """
    if current_user.role == UserRole.DOCTOR:
        result = await db.execute(
            select(DoctorPatientAccess).where(
                and_(
                    DoctorPatientAccess.doctor_id == current_user.id,
                    DoctorPatientAccess.patient_profile_id == patient_profile_id,
                )
            )
        )
        access = result.scalar_one_or_none()

    elif current_user.role == UserRole.ASSISTANT:
        # Get all active doctor assignments for this assistant
        assignments = await get_assistant_assignments(db, current_user.id)
        if not assignments:
            raise HTTPException(status_code=403, detail="No tienes asignación activa como asistente.")

        doctor_ids = [a.doctor_id for a in assignments]

        # Check if any of the assigned doctors have access to this patient
        result = await db.execute(
            select(DoctorPatientAccess).where(
                and_(
                    DoctorPatientAccess.doctor_id.in_(doctor_ids),
                    DoctorPatientAccess.patient_profile_id == patient_profile_id,
                )
            )
        )
        access = result.scalars().first()
    else:
        raise HTTPException(status_code=403, detail="Rol no autorizado.")

    if not access:
        raise HTTPException(status_code=403, detail="No access to this patient")

    if require_write and access.access_level != DoctorAccessLevel.WRITE:
        raise HTTPException(status_code=403, detail="Write access required")

    return access
