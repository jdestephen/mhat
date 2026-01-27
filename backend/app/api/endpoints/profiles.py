from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.patient import PatientProfile, Medication, MedicationStatus, Condition
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
        # Create patient profile with user's name
        profile = PatientProfile(
            user_id=current_user.id,
            first_name=current_user.first_name,
            last_name=current_user.last_name
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        
        # Create self-referential family membership
        from app.models.family import FamilyMembership, RelationshipType, AccessLevel
        membership = FamilyMembership(
            user_id=current_user.id,
            patient_profile_id=profile.id,
            relationship_type=RelationshipType.SELF,
            access_level=AccessLevel.FULL_ACCESS,
            can_manage_family=True,
            created_by=current_user.id,
            is_active=True
        )
        db.add(membership)
        await db.commit()
        
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
        profile = PatientProfile(
            user_id=current_user.id,
            first_name=current_user.first_name,
            last_name=current_user.last_name
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        
        # Create self-referential family membership
        from app.models.family import FamilyMembership, RelationshipType, AccessLevel
        membership = FamilyMembership(
            user_id=current_user.id,
            patient_profile_id=profile.id,
            relationship_type=RelationshipType.SELF,
            access_level=AccessLevel.FULL_ACCESS,
            can_manage_family=True,
            created_by=current_user.id,
            is_active=True
        )
        db.add(membership)
    
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
        profile = PatientProfile(
            user_id=current_user.id,
            first_name=current_user.first_name,
            last_name=current_user.last_name
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        
        # Create self-referential family membership
        from app.models.family import FamilyMembership, RelationshipType, AccessLevel
        membership = FamilyMembership(
            user_id=current_user.id,
            patient_profile_id=profile.id,
            relationship_type=RelationshipType.SELF,
            access_level=AccessLevel.FULL_ACCESS,
            can_manage_family=True,
            created_by=current_user.id,
            is_active=True
        )
        db.add(membership)
        await db.commit()

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
        profile = PatientProfile(
            user_id=current_user.id,
            first_name=current_user.first_name,
            last_name=current_user.last_name
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        
        # Create self-referential family membership
        from app.models.family import FamilyMembership, RelationshipType, AccessLevel
        membership = FamilyMembership(
            user_id=current_user.id,
            patient_profile_id=profile.id,
            relationship_type=RelationshipType.SELF,
            access_level=AccessLevel.FULL_ACCESS,
            can_manage_family=True,
            created_by=current_user.id,
            is_active=True
        )
        db.add(membership)
        await db.commit()

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


# ==========================
# Medication Endpoints
# ==========================

@router.post("/patient/medications", response_model=patient_schema.Medication)
async def create_patient_medication(
    *,
    db: AsyncSession = Depends(get_db),
    medication_in: patient_schema.MedicationCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create a new medication for the current user's patient profile."""
    
    # DEBUG: Print the incoming medication data
    print(f"DEBUG: Received medication_in: {medication_in}")
    print(f"DEBUG: medication_in.dict(): {medication_in.dict()}")
    print(f"DEBUG: Status type: {type(medication_in.status)}, value: {medication_in.status}")
    print(f"DEBUG: Source type: {type(medication_in.source)}, value: {medication_in.source}")
    
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")

    # Get patient profile
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")

    # Get patient profile
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Convert Pydantic model to dict and extract enum values
    medication_data = medication_in.dict()
    
    # Ensure enum values are strings, not enum objects
    if 'status' in medication_data and medication_data['status'] is not None:
        medication_data['status'] = medication_data['status'] if isinstance(medication_data['status'], str) else medication_data['status'].value
    if 'source' in medication_data and medication_data['source'] is not None:
        medication_data['source'] = medication_data['source'] if isinstance(medication_data['source'], str) else medication_data['source'].value
    
    medication = Medication(
        patient_profile_id=profile.id,
        created_by_id=current_user.id,
        **medication_data
    )
    db.add(medication)
    await db.commit()
    await db.refresh(medication)
    return medication


@router.get("/patient/medications", response_model=List[patient_schema.Medication])
async def get_patient_medications(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    status: patient_schema.MedicationStatus = None,
    condition_id: int = None,
) -> Any:
    """
    Get all medications for the current user.
    Optional filters: status, condition_id
    """
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")

    # Get patient profile
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        return []

    # Build query with filters
    query = select(Medication).filter(Medication.patient_profile_id == profile.id)
    
    if status:
        query = query.filter(Medication.status == status)
    
    if condition_id is not None:
        query = query.filter(Medication.condition_id == condition_id)
    
    query = query.order_by(Medication.recorded_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/patient/medications/active", response_model=List[patient_schema.Medication])
async def get_active_medications(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get only currently active medications (status=active AND end_date IS NULL)."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")

    # Get patient profile
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        return []

    # Query active medications
    medications = await db.execute(
        select(Medication).filter(
            Medication.patient_profile_id == profile.id,
            Medication.status == MedicationStatus.ACTIVE,
            Medication.end_date.is_(None)
        ).order_by(Medication.start_date.desc())
    )
    return medications.scalars().all()


@router.get("/patient/medications/{medication_id}", response_model=patient_schema.Medication)
async def get_medication(
    *,
    medication_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get a specific medication by ID."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")

    # Get patient profile
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Get medication
    result = await db.execute(
        select(Medication).filter(
            Medication.id == medication_id,
            Medication.patient_profile_id == profile.id
        )
    )
    medication = result.scalars().first()
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    return medication


@router.patch("/patient/medications/{medication_id}", response_model=patient_schema.Medication)
async def update_medication(
    *,
    medication_id: int,
    medication_in: patient_schema.MedicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update a medication (e.g., change status, add end_date, update dosage)."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")

    # Get patient profile
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Get medication
    result = await db.execute(
        select(Medication).filter(
            Medication.id == medication_id,
            Medication.patient_profile_id == profile.id
        )
    )
    medication = result.scalars().first()
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    # Update fields
    update_data = medication_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(medication, field, value)
    
    await db.commit()
    await db.refresh(medication)
    return medication


@router.delete("/patient/medications/{medication_id}", status_code=204)
async def delete_medication(
    *,
    medication_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> None:
    """Delete a medication."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")

    # Get patient profile
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Get medication
    result = await db.execute(
        select(Medication).filter(
            Medication.id == medication_id,
            Medication.patient_profile_id == profile.id
        )
    )
    medication = result.scalars().first()
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    await db.delete(medication)
    await db.commit()


@router.get("/patient/conditions/{condition_id}/medications", response_model=List[patient_schema.Medication])
async def get_medications_for_condition(
    *,
    condition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get all medications linked to a specific condition."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")

    # Get patient profile
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        return []

    # Get condition and verify ownership
    result = await db.execute(select(Condition).filter(Condition.id == condition_id))
    condition = result.scalars().first()
    
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")
    
    if condition.patient_profile_id != profile.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get medications for this condition
    medications = await db.execute(
        select(Medication).filter(
            Medication.condition_id == condition_id
        ).order_by(Medication.recorded_at.desc())
    )
    return medications.scalars().all()
