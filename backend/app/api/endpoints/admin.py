"""
Admin Endpoints

Endpoints for admin users to manage doctor approvals.
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.doctor import DoctorProfile, DoctorApprovalStatus
from app.services.email import send_doctor_approval_email, send_doctor_rejection_email
from app.services.storage import get_presigned_url

router = APIRouter()


# =====================
# Schemas
# =====================

class DoctorApplicationSummary(BaseModel):
    """Summary of a pending doctor application."""
    profile_id: UUID
    user_id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: str
    college_number: Optional[str] = None
    verification_phone: Optional[str] = None
    approval_status: DoctorApprovalStatus
    registered_at: datetime
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    # Document verification fields
    identity_document_url: Optional[str] = None
    college_document_url: Optional[str] = None
    ocr_extracted_data: Optional[dict] = None
    ocr_processed: bool = False
    verification_notes: Optional[str] = None


class ApproveRequest(BaseModel):
    """No extra fields needed for approval."""
    pass


class RejectRequest(BaseModel):
    reason: str


# =====================
# Endpoints
# =====================

@router.get("/doctors", response_model=List[DoctorApplicationSummary])
async def list_doctor_applications(
    status: Optional[DoctorApprovalStatus] = Query(None, description="Filter by approval status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.require_admin),
):
    """List doctor applications, optionally filtered by status."""
    query = (
        select(DoctorProfile, User)
        .join(User, DoctorProfile.user_id == User.id)
        .where(User.role == UserRole.DOCTOR)
        .order_by(DoctorProfile.approval_status.asc())
    )

    if status:
        query = query.where(DoctorProfile.approval_status == status)

    result = await db.execute(query)
    applications = []
    for profile, user in result.all():
        applications.append(DoctorApplicationSummary(
            profile_id=profile.id,
            user_id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            college_number=profile.college_number,
            verification_phone=profile.verification_phone,
            approval_status=profile.approval_status,
            registered_at=user.created_at,
            approved_at=profile.approved_at,
            rejection_reason=profile.rejection_reason,
            identity_document_url=get_presigned_url(profile.identity_document_key) if profile.identity_document_key else None,
            college_document_url=get_presigned_url(profile.college_document_key) if profile.college_document_key else None,
            ocr_extracted_data=profile.ocr_extracted_data,
            ocr_processed=profile.ocr_processed,
            verification_notes=profile.verification_notes,
        ))

    return applications


@router.get("/doctors/{profile_id}", response_model=DoctorApplicationSummary)
async def get_doctor_application(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.require_admin),
):
    """Get details of a specific doctor application."""
    result = await db.execute(
        select(DoctorProfile, User)
        .join(User, DoctorProfile.user_id == User.id)
        .where(DoctorProfile.id == profile_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Perfil de médico no encontrado.")

    profile, user = row
    return DoctorApplicationSummary(
        profile_id=profile.id,
        user_id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        college_number=profile.college_number,
        verification_phone=profile.verification_phone,
        approval_status=profile.approval_status,
        registered_at=user.created_at,
        approved_at=profile.approved_at,
        rejection_reason=profile.rejection_reason,
        identity_document_url=get_presigned_url(profile.identity_document_key) if profile.identity_document_key else None,
        college_document_url=get_presigned_url(profile.college_document_key) if profile.college_document_key else None,
        ocr_extracted_data=profile.ocr_extracted_data,
        ocr_processed=profile.ocr_processed,
        verification_notes=profile.verification_notes,
    )


@router.post("/doctors/{profile_id}/approve")
async def approve_doctor(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.require_admin),
):
    """Approve a pending doctor application."""
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.id == profile_id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de médico no encontrado.")

    if profile.approval_status == DoctorApprovalStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Este médico ya está aprobado.")

    profile.approval_status = DoctorApprovalStatus.APPROVED
    profile.approved_by = current_user.id
    profile.approved_at = datetime.now(timezone.utc)
    profile.rejection_reason = None

    await db.commit()

    # Send approval notification email
    user_result = await db.execute(select(User).where(User.id == profile.user_id))
    doctor_user = user_result.scalars().first()
    if doctor_user:
        doctor_name = f"{doctor_user.first_name or ''} {doctor_user.last_name or ''}".strip()
        await send_doctor_approval_email(doctor_user.email, doctor_name)

    return {"message": "Médico aprobado exitosamente."}


@router.post("/doctors/{profile_id}/reject")
async def reject_doctor(
    profile_id: UUID,
    body: RejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.require_admin),
):
    """Reject a doctor application with a reason."""
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.id == profile_id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de médico no encontrado.")

    if profile.approval_status == DoctorApprovalStatus.APPROVED:
        raise HTTPException(status_code=400, detail="No se puede rechazar un médico ya aprobado.")

    profile.approval_status = DoctorApprovalStatus.REJECTED
    profile.rejection_reason = body.reason
    profile.approved_by = current_user.id

    await db.commit()

    # Send rejection notification email
    user_result = await db.execute(select(User).where(User.id == profile.user_id))
    doctor_user = user_result.scalars().first()
    if doctor_user:
        doctor_name = f"{doctor_user.first_name or ''} {doctor_user.last_name or ''}".strip()
        await send_doctor_rejection_email(doctor_user.email, doctor_name, body.reason)

    return {"message": "Solicitud de médico rechazada."}
