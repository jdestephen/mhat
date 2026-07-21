"""
Profile CRUD Endpoints

Core profile endpoints: GET/PUT for patient and doctor profiles.
Health data endpoints are in health_data.py.
Doctor access management endpoints are in doctor_access.py.
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.patient import PatientProfile
from app.models.doctor import DoctorProfile
from app.schemas import patient as patient_schema
from app.schemas import doctor as doctor_schema

router = APIRouter()


@router.get("/patient", response_model=patient_schema.PatientProfile)
async def get_patient_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    profile_id: Optional[str] = Query(None, description="Target patient profile ID"),
) -> Any:
    """
    Get a patient profile. Supports profile switching via profile_id.
    Auto-creates SELF profile + FamilyMembership if none exists for the user.
    """
    try:
        profile = await deps.resolve_patient_profile(db, current_user, profile_id)
    except HTTPException as exc:
        if exc.status_code == 404 and not profile_id:
            # Auto-create for SELF
            profile = PatientProfile(
                user_id=current_user.id,
                first_name=current_user.first_name,
                last_name=current_user.last_name,
            )
            db.add(profile)
            await db.commit()
            await db.refresh(profile)

            from app.models.family import FamilyMembership, RelationshipType, AccessLevel
            membership = FamilyMembership(
                user_id=current_user.id,
                patient_profile_id=profile.id,
                relationship_type=RelationshipType.SELF,
                access_level=AccessLevel.FULL_ACCESS,
                can_manage_family=True,
                created_by=current_user.id,
                is_active=True,
            )
            db.add(membership)
            await db.commit()
        else:
            raise

    # Re-fetch with eager loading
    result = await db.execute(
        select(PatientProfile)
        .filter(PatientProfile.id == profile.id)
        .options(
            selectinload(PatientProfile.medications),
            selectinload(PatientProfile.allergies),
            selectinload(PatientProfile.conditions),
            selectinload(PatientProfile.personal_references),
            selectinload(PatientProfile.health_habit),
            selectinload(PatientProfile.family_history),
            selectinload(PatientProfile.locations),
            selectinload(PatientProfile.surgeries),
            selectinload(PatientProfile.vaccines),
        )
    )
    return result.scalars().first()


@router.put("/patient", response_model=patient_schema.PatientProfile)
async def update_patient_profile(
    *,
    db: AsyncSession = Depends(get_db),
    profile_in: patient_schema.PatientProfileUpdate,
    current_user: User = Depends(deps.get_current_user),
    profile_id: Optional[str] = Query(None),
) -> Any:
    """Update a patient profile."""
    try:
        profile = await deps.resolve_patient_profile(db, current_user, profile_id)
    except HTTPException as exc:
        if exc.status_code == 404 and not profile_id:
            profile = PatientProfile(
                user_id=current_user.id,
                first_name=current_user.first_name,
                last_name=current_user.last_name,
            )
            db.add(profile)
            await db.commit()
            await db.refresh(profile)

            from app.models.family import FamilyMembership, RelationshipType, AccessLevel
            membership = FamilyMembership(
                user_id=current_user.id,
                patient_profile_id=profile.id,
                relationship_type=RelationshipType.SELF,
                access_level=AccessLevel.FULL_ACCESS,
                can_manage_family=True,
                created_by=current_user.id,
                is_active=True,
            )
            db.add(membership)
            await db.commit()
        else:
            raise

    update_data = profile_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)

    # Re-fetch with eager loading
    result = await db.execute(
        select(PatientProfile)
        .filter(PatientProfile.id == profile.id)
        .options(
            selectinload(PatientProfile.medications),
            selectinload(PatientProfile.allergies),
            selectinload(PatientProfile.conditions),
            selectinload(PatientProfile.personal_references),
            selectinload(PatientProfile.health_habit),
            selectinload(PatientProfile.family_history),
            selectinload(PatientProfile.locations),
            selectinload(PatientProfile.surgeries),
            selectinload(PatientProfile.vaccines),
        )
    )
    return result.scalars().first()


# ==========================
# Doctor Profile
# ==========================

@router.get("/doctor", response_model=doctor_schema.DoctorProfile)
async def get_doctor_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get current user's doctor profile."""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Not a doctor")

    result = await db.execute(
        select(DoctorProfile).filter(DoctorProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()

    if not profile:
        profile = DoctorProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return profile


@router.put("/doctor", response_model=doctor_schema.DoctorProfile)
async def update_doctor_profile(
    *,
    db: AsyncSession = Depends(get_db),
    profile_in: doctor_schema.DoctorProfileUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update current user's doctor profile."""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Not a doctor")

    result = await db.execute(
        select(DoctorProfile).filter(DoctorProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()

    if not profile:
        profile = DoctorProfile(user_id=current_user.id)
        db.add(profile)

    update_data = profile_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile
