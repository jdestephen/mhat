from typing import Any
from fastapi import APIRouter, Depends, HTTPException
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

@router.put("/patient", response_model=patient_schema.PatientProfile)
async def update_patient_profile(
    *,
    db: AsyncSession = Depends(get_db),
    profile_in: patient_schema.PatientProfileUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")
    
    # Fetch profile
    result = await db.execute(
        select(PatientProfile)
        .filter(PatientProfile.user_id == current_user.id)
        .options(selectinload(PatientProfile.medications))
    )
    profile = result.scalars().first()
    
    if not profile:
        # Should have been created at registration, but just in case
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)
    
    update_data = profile_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
        
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
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Not a doctor")
        
    result = await db.execute(select(DoctorProfile).filter(DoctorProfile.user_id == current_user.id))
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
