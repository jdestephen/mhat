"""
Assistant Management Endpoints

Endpoints for doctors to manage their assistants (invite, list, update permissions, deactivate).
"""
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_user
from app.api.endpoints.doctor._helpers import require_doctor_role
from app.db.session import get_db
from app.models.assistant import (
    AssistantInvitation,
    DoctorAssistantAssignment,
)
from app.models.organization import HealthCenter, HealthCenterMembership
from app.models.user import User, UserRole
from app.schemas.assistant import (
    AssistantAssignmentResponse,
    AssistantInvitationResponse,
    AssistantInviteRequest,
    AssistantPermissionsUpdate,
)

router = APIRouter()

INVITATION_EXPIRY_HOURS = 48


# =============================================
# Invitations
# =============================================

@router.post("/assistants/invite", response_model=AssistantInvitationResponse)
async def invite_assistant(
    body: AssistantInviteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Invite a new assistant. Sends an activation email with a unique token.
    The assistant creates their account and password via the activation link.
    """
    # Verify the doctor is affiliated with the specified HC
    membership_result = await db.execute(
        select(HealthCenterMembership).where(
            HealthCenterMembership.user_id == current_user.id,
            HealthCenterMembership.health_center_id == body.health_center_id,
            HealthCenterMembership.end_date.is_(None),
        )
    )
    if not membership_result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="No estás afiliado a este centro de salud.",
        )

    # Check if there's already a pending invitation for this email + doctor
    existing_result = await db.execute(
        select(AssistantInvitation).where(
            AssistantInvitation.doctor_id == current_user.id,
            AssistantInvitation.email == body.email,
            AssistantInvitation.claimed_at.is_(None),
            AssistantInvitation.is_revoked == False,
            AssistantInvitation.expires_at > datetime.now(timezone.utc),
        )
    )
    if existing_result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Ya existe una invitación pendiente para este correo.",
        )

    # Check if assistant already has an active account and assignment
    existing_user_result = await db.execute(
        select(User).where(User.email == body.email, User.role == UserRole.ASSISTANT)
    )
    existing_user = existing_user_result.scalars().first()
    if existing_user:
        # Check if already assigned to this doctor at this HC
        existing_assignment = await db.execute(
            select(DoctorAssistantAssignment).where(
                DoctorAssistantAssignment.doctor_id == current_user.id,
                DoctorAssistantAssignment.assistant_id == existing_user.id,
                DoctorAssistantAssignment.health_center_id == body.health_center_id,
                DoctorAssistantAssignment.is_active == True,
            )
        )
        if existing_assignment.scalars().first():
            raise HTTPException(
                status_code=400,
                detail="Este asistente ya está asignado a ti en este centro de salud.",
            )

    # Get HC name for response
    hc_result = await db.execute(select(HealthCenter).where(HealthCenter.id == body.health_center_id))
    hc = hc_result.scalars().first()

    token = secrets.token_urlsafe(48)

    invitation = AssistantInvitation(
        doctor_id=current_user.id,
        health_center_id=body.health_center_id,
        email=body.email,
        first_name=body.first_name,
        last_name=body.last_name,
        permissions=[p.value for p in body.permissions],
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=INVITATION_EXPIRY_HOURS),
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)

    # TODO: Send invitation email with activation link

    return AssistantInvitationResponse(
        id=invitation.id,
        doctor_id=invitation.doctor_id,
        health_center_id=invitation.health_center_id,
        health_center_name=hc.name if hc else "",
        email=invitation.email,
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        permissions=invitation.permissions,
        expires_at=invitation.expires_at,
        claimed_at=invitation.claimed_at,
        is_revoked=invitation.is_revoked,
        created_at=invitation.created_at,
    )


@router.get("/assistants/invitations", response_model=List[AssistantInvitationResponse])
async def list_invitations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """List all invitations created by the current doctor."""
    result = await db.execute(
        select(AssistantInvitation, HealthCenter)
        .join(HealthCenter, AssistantInvitation.health_center_id == HealthCenter.id)
        .where(AssistantInvitation.doctor_id == current_user.id)
        .order_by(AssistantInvitation.created_at.desc())
    )

    return [
        AssistantInvitationResponse(
            id=inv.id,
            doctor_id=inv.doctor_id,
            health_center_id=inv.health_center_id,
            health_center_name=hc.name,
            email=inv.email,
            first_name=inv.first_name,
            last_name=inv.last_name,
            permissions=inv.permissions,
            expires_at=inv.expires_at,
            claimed_at=inv.claimed_at,
            is_revoked=inv.is_revoked,
            created_at=inv.created_at,
        )
        for inv, hc in result.all()
    ]


@router.delete("/assistants/invitations/{invitation_id}")
async def revoke_invitation(
    invitation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Revoke a pending invitation."""
    result = await db.execute(
        select(AssistantInvitation).where(
            AssistantInvitation.id == invitation_id,
            AssistantInvitation.doctor_id == current_user.id,
        )
    )
    invitation = result.scalars().first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitación no encontrada.")
    if invitation.claimed_at:
        raise HTTPException(status_code=400, detail="La invitación ya fue utilizada.")

    invitation.is_revoked = True
    await db.commit()
    return {"message": "Invitación revocada."}


# =============================================
# Assignment Management
# =============================================

@router.get("/assistants", response_model=List[AssistantAssignmentResponse])
async def list_assistants(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """List all assistants assigned to the current doctor."""
    result = await db.execute(
        select(DoctorAssistantAssignment, User, HealthCenter)
        .join(User, DoctorAssistantAssignment.assistant_id == User.id)
        .join(HealthCenter, DoctorAssistantAssignment.health_center_id == HealthCenter.id)
        .where(DoctorAssistantAssignment.doctor_id == current_user.id)
        .order_by(DoctorAssistantAssignment.is_active.desc(), User.first_name)
    )

    return [
        AssistantAssignmentResponse(
            id=assignment.id,
            doctor_id=assignment.doctor_id,
            assistant_id=assignment.assistant_id,
            assistant_email=user.email,
            assistant_first_name=user.first_name,
            assistant_last_name=user.last_name,
            health_center_id=assignment.health_center_id,
            health_center_name=hc.name,
            permissions=assignment.permissions,
            is_active=assignment.is_active,
            created_at=assignment.created_at,
            deactivated_at=assignment.deactivated_at,
        )
        for assignment, user, hc in result.all()
    ]


@router.patch("/assistants/{assignment_id}/permissions", response_model=AssistantAssignmentResponse)
async def update_assistant_permissions(
    assignment_id: UUID,
    body: AssistantPermissionsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Update an assistant's permissions."""
    result = await db.execute(
        select(DoctorAssistantAssignment).where(
            DoctorAssistantAssignment.id == assignment_id,
            DoctorAssistantAssignment.doctor_id == current_user.id,
        )
    )
    assignment = result.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada.")
    if not assignment.is_active:
        raise HTTPException(status_code=400, detail="No se pueden cambiar permisos de un asistente desactivado.")

    assignment.permissions = [p.value for p in body.permissions]
    await db.commit()
    await db.refresh(assignment)

    # Fetch related data for response
    user_result = await db.execute(select(User).where(User.id == assignment.assistant_id))
    user = user_result.scalars().first()
    hc_result = await db.execute(select(HealthCenter).where(HealthCenter.id == assignment.health_center_id))
    hc = hc_result.scalars().first()

    return AssistantAssignmentResponse(
        id=assignment.id,
        doctor_id=assignment.doctor_id,
        assistant_id=assignment.assistant_id,
        assistant_email=user.email if user else "",
        assistant_first_name=user.first_name if user else None,
        assistant_last_name=user.last_name if user else None,
        health_center_id=assignment.health_center_id,
        health_center_name=hc.name if hc else "",
        permissions=assignment.permissions,
        is_active=assignment.is_active,
        created_at=assignment.created_at,
        deactivated_at=assignment.deactivated_at,
    )


@router.post("/assistants/{assignment_id}/deactivate")
async def deactivate_assistant(
    assignment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Deactivate an assistant assignment. The assistant loses access to this doctor's patients."""
    result = await db.execute(
        select(DoctorAssistantAssignment).where(
            DoctorAssistantAssignment.id == assignment_id,
            DoctorAssistantAssignment.doctor_id == current_user.id,
        )
    )
    assignment = result.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada.")
    if not assignment.is_active:
        raise HTTPException(status_code=400, detail="Este asistente ya está desactivado.")

    assignment.is_active = False
    assignment.deactivated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Asistente desactivado exitosamente."}


@router.post("/assistants/{assignment_id}/reactivate")
async def reactivate_assistant(
    assignment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Reactivate a previously deactivated assistant assignment."""
    result = await db.execute(
        select(DoctorAssistantAssignment).where(
            DoctorAssistantAssignment.id == assignment_id,
            DoctorAssistantAssignment.doctor_id == current_user.id,
        )
    )
    assignment = result.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada.")
    if assignment.is_active:
        raise HTTPException(status_code=400, detail="Este asistente ya está activo.")

    assignment.is_active = True
    assignment.deactivated_at = None
    await db.commit()
    return {"message": "Asistente reactivado exitosamente."}
