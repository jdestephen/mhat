"""
Health Center Endpoints

CRUD endpoints for health centers — used by doctors to manage their affiliations
and by admins to verify/reject health centers.
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.organization import (
    HealthCenter,
    HealthCenterMembership,
    HealthCenterRole,
    HealthCenterType,
    HealthCenterVerificationStatus,
)
from app.models.user import User, UserRole
from app.schemas.health_center import (
    HealthCenterCreate,
    HealthCenterDetailResponse,
    HealthCenterMembershipResponse,
    HealthCenterReject,
    HealthCenterResponse,
    HealthCenterUpdate,
)

router = APIRouter()


# =============================================
# Doctor-facing endpoints
# =============================================

@router.get("/health-centers", response_model=List[HealthCenterResponse])
async def list_health_centers(
    q: Optional[str] = Query(None, description="Search by name or city"),
    type: Optional[HealthCenterType] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List verified health centers. Doctors use this to find and join existing HCs."""
    query = select(HealthCenter).where(
        HealthCenter.verification_status == HealthCenterVerificationStatus.VERIFIED,
        HealthCenter.is_active == True,
    )

    if q:
        search = f"%{q}%"
        query = query.where(
            or_(
                HealthCenter.name.ilike(search),
                HealthCenter.city.ilike(search),
            )
        )

    if type:
        query = query.where(HealthCenter.type == type)

    query = query.order_by(HealthCenter.name).limit(50)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/health-centers/mine", response_model=List[HealthCenterMembershipResponse])
async def list_my_health_centers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List health centers the current user is affiliated with (including pending ones they created)."""
    if current_user.role not in (UserRole.DOCTOR, UserRole.ASSISTANT):
        raise HTTPException(status_code=403, detail="Solo médicos y asistentes pueden ver centros de salud.")

    result = await db.execute(
        select(HealthCenterMembership, HealthCenter)
        .join(HealthCenter, HealthCenterMembership.health_center_id == HealthCenter.id)
        .where(
            HealthCenterMembership.user_id == current_user.id,
            HealthCenterMembership.end_date.is_(None),
        )
        .order_by(HealthCenterMembership.is_primary.desc(), HealthCenter.name)
    )

    memberships = []
    for membership, hc in result.all():
        memberships.append(HealthCenterMembershipResponse(
            id=membership.id,
            health_center_id=hc.id,
            health_center_name=hc.name,
            health_center_type=hc.type,
            role=membership.role.value,
            specialty=membership.specialty,
            is_primary=membership.is_primary,
            verification_status=hc.verification_status,
        ))
    return memberships


@router.post("/health-centers", response_model=HealthCenterResponse)
async def create_health_center(
    hc_in: HealthCenterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new health center. Status starts as PENDING.
    The creating doctor is auto-affiliated and can use it immediately.
    Other doctors cannot see PENDING HCs.
    """
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Solo médicos pueden crear centros de salud.")

    hc = HealthCenter(
        **hc_in.model_dump(),
        verification_status=HealthCenterVerificationStatus.PENDING,
        created_by_id=current_user.id,
    )
    db.add(hc)
    await db.flush()

    # Auto-affiliate the creating doctor
    membership = HealthCenterMembership(
        user_id=current_user.id,
        health_center_id=hc.id,
        role=HealthCenterRole.DOCTOR,
        is_primary=False,
        created_by_id=current_user.id,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(hc)
    return hc


@router.post("/health-centers/{hc_id}/join")
async def join_health_center(
    hc_id: UUID,
    specialty: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Join an existing verified health center."""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Solo médicos pueden afiliarse a centros de salud.")

    # Verify the HC exists and is verified
    result = await db.execute(
        select(HealthCenter).where(HealthCenter.id == hc_id)
    )
    hc = result.scalars().first()
    if not hc:
        raise HTTPException(status_code=404, detail="Centro de salud no encontrado.")
    if hc.verification_status != HealthCenterVerificationStatus.VERIFIED:
        raise HTTPException(status_code=400, detail="Solo puedes afiliarte a centros de salud verificados.")

    # Check if already a member
    existing = await db.execute(
        select(HealthCenterMembership).where(
            HealthCenterMembership.user_id == current_user.id,
            HealthCenterMembership.health_center_id == hc_id,
            HealthCenterMembership.end_date.is_(None),
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Ya estás afiliado a este centro de salud.")

    membership = HealthCenterMembership(
        user_id=current_user.id,
        health_center_id=hc_id,
        role=HealthCenterRole.DOCTOR,
        specialty=specialty,
        created_by_id=current_user.id,
    )
    db.add(membership)
    await db.commit()
    return {"message": "Afiliación exitosa.", "health_center_name": hc.name}


@router.delete("/health-centers/{hc_id}/leave")
async def leave_health_center(
    hc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Leave a health center (soft-delete via end_date)."""
    result = await db.execute(
        select(HealthCenterMembership).where(
            HealthCenterMembership.user_id == current_user.id,
            HealthCenterMembership.health_center_id == hc_id,
            HealthCenterMembership.end_date.is_(None),
        )
    )
    membership = result.scalars().first()
    if not membership:
        raise HTTPException(status_code=404, detail="No estás afiliado a este centro de salud.")

    membership.end_date = datetime.now(timezone.utc).date()
    await db.commit()
    return {"message": "Desafiliación exitosa."}


@router.put("/health-centers/{hc_id}/set-primary")
async def set_primary_health_center(
    hc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set a health center as the doctor's primary workplace."""
    # Clear existing primary
    result = await db.execute(
        select(HealthCenterMembership).where(
            HealthCenterMembership.user_id == current_user.id,
            HealthCenterMembership.end_date.is_(None),
        )
    )
    for m in result.scalars().all():
        m.is_primary = (m.health_center_id == hc_id)

    await db.commit()
    return {"message": "Centro de salud primario actualizado."}


# =============================================
# Admin-facing endpoints
# =============================================

@router.get("/admin/health-centers", response_model=List[HealthCenterDetailResponse])
async def admin_list_health_centers(
    status: Optional[HealthCenterVerificationStatus] = Query(None),
    q: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: List health centers with optional status filter."""
    query = select(HealthCenter)

    if status:
        query = query.where(HealthCenter.verification_status == status)
    if q:
        search = f"%{q}%"
        query = query.where(HealthCenter.name.ilike(search))

    query = query.order_by(HealthCenter.created_at.desc()).limit(100)
    result = await db.execute(query)
    hcs = result.scalars().all()

    responses = []
    for hc in hcs:
        # Fetch creator name if available
        creator_name = None
        if hc.created_by_id:
            creator_result = await db.execute(select(User).where(User.id == hc.created_by_id))
            creator = creator_result.scalars().first()
            if creator:
                creator_name = f"{creator.first_name or ''} {creator.last_name or ''}".strip()

        # Fetch suggested HC name if available
        suggested_name = None
        if hc.suggested_health_center_id:
            suggested_result = await db.execute(select(HealthCenter).where(HealthCenter.id == hc.suggested_health_center_id))
            suggested = suggested_result.scalars().first()
            if suggested:
                suggested_name = suggested.name

        responses.append(HealthCenterDetailResponse(
            id=hc.id,
            name=hc.name,
            type=hc.type,
            description=hc.description,
            address=hc.address,
            city=hc.city,
            country=hc.country,
            phone=hc.phone,
            email=hc.email,
            website=hc.website,
            latitude=hc.latitude,
            longitude=hc.longitude,
            logo_key=hc.logo_key,
            tax_id=hc.tax_id,
            is_active=hc.is_active,
            verification_status=hc.verification_status,
            created_at=hc.created_at,
            verified_by=hc.verified_by,
            verified_at=hc.verified_at,
            rejection_reason=hc.rejection_reason,
            suggested_health_center_id=hc.suggested_health_center_id,
            suggested_health_center_name=suggested_name,
            created_by_id=hc.created_by_id,
            created_by_name=creator_name,
        ))
    return responses


@router.post("/admin/health-centers", response_model=HealthCenterResponse)
async def admin_create_health_center(
    hc_in: HealthCenterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: Create a pre-verified health center."""
    hc = HealthCenter(
        **hc_in.model_dump(),
        verification_status=HealthCenterVerificationStatus.VERIFIED,
        verified_by=current_user.id,
        verified_at=datetime.now(timezone.utc),
        created_by_id=current_user.id,
    )
    db.add(hc)
    await db.commit()
    await db.refresh(hc)
    return hc


@router.put("/admin/health-centers/{hc_id}", response_model=HealthCenterResponse)
async def admin_update_health_center(
    hc_id: UUID,
    hc_in: HealthCenterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: Update a health center's information."""
    result = await db.execute(select(HealthCenter).where(HealthCenter.id == hc_id))
    hc = result.scalars().first()
    if not hc:
        raise HTTPException(status_code=404, detail="Centro de salud no encontrado.")

    update_data = hc_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(hc, field, value)

    await db.commit()
    await db.refresh(hc)
    return hc


@router.post("/admin/health-centers/{hc_id}/verify")
async def admin_verify_health_center(
    hc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: Verify a pending health center."""
    result = await db.execute(select(HealthCenter).where(HealthCenter.id == hc_id))
    hc = result.scalars().first()
    if not hc:
        raise HTTPException(status_code=404, detail="Centro de salud no encontrado.")
    if hc.verification_status == HealthCenterVerificationStatus.VERIFIED:
        raise HTTPException(status_code=400, detail="Este centro de salud ya está verificado.")

    hc.verification_status = HealthCenterVerificationStatus.VERIFIED
    hc.verified_by = current_user.id
    hc.verified_at = datetime.now(timezone.utc)
    hc.rejection_reason = None
    hc.suggested_health_center_id = None

    await db.commit()
    return {"message": "Centro de salud verificado exitosamente."}


@router.post("/admin/health-centers/{hc_id}/reject")
async def admin_reject_health_center(
    hc_id: UUID,
    body: HealthCenterReject,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Admin: Reject a health center with a reason.
    If rejected due to duplicate, include suggested_health_center_id so the
    doctor is prompted to use the existing HC instead.
    """
    result = await db.execute(select(HealthCenter).where(HealthCenter.id == hc_id))
    hc = result.scalars().first()
    if not hc:
        raise HTTPException(status_code=404, detail="Centro de salud no encontrado.")
    if hc.verification_status == HealthCenterVerificationStatus.VERIFIED:
        raise HTTPException(status_code=400, detail="No se puede rechazar un centro de salud verificado.")

    # Validate suggested HC exists if provided
    if body.suggested_health_center_id:
        suggested_result = await db.execute(
            select(HealthCenter).where(HealthCenter.id == body.suggested_health_center_id)
        )
        if not suggested_result.scalars().first():
            raise HTTPException(status_code=400, detail="El centro de salud sugerido no existe.")

    hc.verification_status = HealthCenterVerificationStatus.REJECTED
    hc.rejection_reason = body.reason
    hc.suggested_health_center_id = body.suggested_health_center_id
    hc.verified_by = current_user.id

    await db.commit()

    # TODO: Send notification to the doctor who created the HC

    return {"message": "Centro de salud rechazado."}
