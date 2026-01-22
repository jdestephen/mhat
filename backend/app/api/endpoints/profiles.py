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

@router.get("/patient", response_model=patient_schema.PatientProfile)
async def get_patient_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user's patient profile.
    """
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")
        
    result = await db.execute(
        select(PatientProfile)
        .filter(PatientProfile.user_id == current_user.id)
        .options(
            selectinload(PatientProfile.medications),
            selectinload(PatientProfile.allergies),
            selectinload(PatientProfile.conditions)
        )
    )
    profile = result.scalars().first()
    
    if not profile:
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        
    return profile

@router.get("/doctor", response_model=doctor_schema.DoctorProfile)
async def get_doctor_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user's doctor profile.
    """
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Not a doctor")
        
    result = await db.execute(
        select(DoctorProfile)
        .filter(DoctorProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    
    if not profile:
         profile = DoctorProfile(user_id=current_user.id)
         db.add(profile)
         await db.commit()
         await db.refresh(profile)
         
    return profile

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
        .options(
            selectinload(PatientProfile.medications),
            selectinload(PatientProfile.allergies),
            selectinload(PatientProfile.conditions)
        )
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

@router.post("/patient/allergies", response_model=patient_schema.PatientProfile)
async def add_patient_allergy(
    *,
    db: AsyncSession = Depends(get_db),
    allergy_in: patient_schema.AllergyCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Add an allergy to the patient profile.
    """
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")

    # Get profile
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    # Create Allergy
    from app.models.patient import Allergy
    allergy = Allergy(
        patient_profile_id=profile.id,
        **allergy_in.dict()
    )
    db.add(allergy)
    await db.commit()
    
    # Return updated profile with eagerly loaded data
    result = await db.execute(
        select(PatientProfile)
        .filter(PatientProfile.id == profile.id)
        .options(
             selectinload(PatientProfile.medications),
             selectinload(PatientProfile.allergies),
             selectinload(PatientProfile.conditions)
        )
    )
    return result.scalars().first()

@router.post("/patient/conditions", response_model=patient_schema.PatientProfile)
async def add_patient_condition(
    *,
    db: AsyncSession = Depends(get_db),
    condition_in: patient_schema.ConditionCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Add a condition to the patient profile.
    """
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")

    # Get profile
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    # Create Condition
    from app.models.patient import Condition
    condition = Condition(
        patient_profile_id=profile.id,
        **condition_in.dict()
    )
    db.add(condition)
    await db.commit()
    
    # Return updated profile
    result = await db.execute(
        select(PatientProfile)
        .filter(PatientProfile.id == profile.id)
        .options(
             selectinload(PatientProfile.medications),
             selectinload(PatientProfile.allergies),
             selectinload(PatientProfile.conditions)
        )
    )
    return result.scalars().first()

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
