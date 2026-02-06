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


# ==========================
# Doctor Access Management (Patient Side)
# ==========================

from app.models.user import DoctorPatientAccess, AccessLevel as DoctorAccessLevel
from app.models.doctor import DoctorProfile
from app.schemas import clinical as clinical_schema
from datetime import datetime
from sqlalchemy import and_


class DoctorAccessInfo(patient_schema.BaseModel):
    """Information about a doctor with access to patient records."""
    doctor_id: str  # UUID as string
    doctor_name: str
    specialty: str | None = None
    access_level: str
    granted_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/me/doctor-access", response_model=List[DoctorAccessInfo])
async def list_doctors_with_access(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    List all doctors who have access to the current patient's records.
    """
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")
    
    # Get patient profile
    result = await db.execute(
        select(PatientProfile).filter(PatientProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile:
        return []
    
    # Get all active doctor access records
    result = await db.execute(
        select(DoctorPatientAccess, User, DoctorProfile)
        .join(User, DoctorPatientAccess.doctor_id == User.id)
        .join(DoctorProfile, DoctorProfile.user_id == User.id, isouter=True)
        .where(
            DoctorPatientAccess.patient_profile_id == profile.id
        )
    )
    
    doctors = []
    for access, user, doctor_profile in result.all():
        doctors.append(DoctorAccessInfo(
            doctor_id=str(access.doctor_id),
            doctor_name=f"{user.first_name} {user.last_name}",
            specialty=doctor_profile.specialty if doctor_profile else None,
            access_level=access.access_level.value,
            granted_at=access.created_at
        ))
    
    return doctors


@router.post("/me/doctor-access")
async def grant_doctor_access(
    doctor_id: str,
    access_level: str = "READ_ONLY",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Grant a doctor access to the patient's records.
    Patient-initiated access grant.
    """
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")
    
    import uuid as uuid_module
    try:
        doctor_uuid = uuid_module.UUID(doctor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")
    
    # Verify doctor exists and is a doctor
    result = await db.execute(
        select(User).where(
            and_(
                User.id == doctor_uuid,
                User.role == UserRole.DOCTOR
            )
        )
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Get patient profile
    result = await db.execute(
        select(PatientProfile).filter(PatientProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    # Check if access already exists
    result = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.doctor_id == doctor_uuid,
                DoctorPatientAccess.patient_profile_id == profile.id
            )
        )
    )
    existing = result.scalar_one_or_none()
    
    level = DoctorAccessLevel.WRITE if access_level == "WRITE" else DoctorAccessLevel.READ_ONLY
    
    if existing:
        existing.access_level = level
        existing.granted_by = current_user.id
        await db.commit()
        return {"message": "Access updated", "access_level": level.value}
    
    # Create new access
    access = DoctorPatientAccess(
        doctor_id=doctor_uuid,
        patient_profile_id=profile.id,
        access_level=level,
        granted_by=current_user.id,
    )
    db.add(access)
    await db.commit()
    
    return {"message": "Access granted", "access_level": level.value}


@router.delete("/me/doctor-access/{doctor_id}")
async def revoke_doctor_access(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Revoke a doctor's access to the patient's records.
    """
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")
    
    import uuid as uuid_module
    try:
        doctor_uuid = uuid_module.UUID(doctor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")
    
    # Get patient profile
    result = await db.execute(
        select(PatientProfile).filter(PatientProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    # Find and deactivate access
    result = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.doctor_id == doctor_uuid,
                DoctorPatientAccess.patient_profile_id == profile.id
            )
        )
    )
    access = result.scalar_one_or_none()
    
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")
    
    await db.delete(access)
    await db.commit()
    
    return {"message": "Access revoked"}


# ==========================
# Access Invitations (Patient Side)
# ==========================

from app.models.access_invitation import AccessInvitation
from datetime import timedelta


@router.post("/me/invitations", response_model=clinical_schema.AccessInvitationResponse)
async def create_invitation(
    invitation_in: clinical_schema.AccessInvitationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Create an invitation code for a doctor to claim access.
    Code is valid for 24 hours.
    """
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")
    
    # Get patient profile
    result = await db.execute(
        select(PatientProfile).filter(PatientProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    # Validate temporary access requires expires_in_days
    if invitation_in.access_type == "TEMPORARY" and not invitation_in.expires_in_days:
        raise HTTPException(status_code=400, detail="expires_in_days is required for temporary access")
    
    from app.models.user import AccessType as UserAccessType
    access_type = UserAccessType.TEMPORARY if invitation_in.access_type == "TEMPORARY" else UserAccessType.PERMANENT

    invitation = AccessInvitation(
        patient_profile_id=profile.id,
        created_by=current_user.id,
        access_level=invitation_in.access_level,
        access_type=access_type,
        expires_in_days=invitation_in.expires_in_days if invitation_in.access_type == "TEMPORARY" else None,
        code_expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)
    
    return invitation


@router.get("/me/invitations", response_model=List[clinical_schema.AccessInvitationResponse])
async def list_my_invitations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List all invitations created by the patient."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")
    
    result = await db.execute(
        select(PatientProfile).filter(PatientProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    result = await db.execute(
        select(AccessInvitation)
        .where(AccessInvitation.patient_profile_id == profile.id)
        .order_by(AccessInvitation.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/me/invitations/{invitation_id}")
async def revoke_invitation(
    invitation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Revoke an unclaimed invitation."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")
    
    import uuid as uuid_module
    try:
        inv_uuid = uuid_module.UUID(invitation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid invitation ID")
    
    result = await db.execute(
        select(AccessInvitation).where(AccessInvitation.id == inv_uuid)
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    # Verify ownership
    result = await db.execute(
        select(PatientProfile).filter(PatientProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile or invitation.patient_profile_id != profile.id:
        raise HTTPException(status_code=403, detail="Not your invitation")
    
    if invitation.claimed_by:
        raise HTTPException(status_code=400, detail="Cannot revoke a claimed invitation")
    
    invitation.is_revoked = True
    await db.commit()
    
    return {"message": "Invitation revoked"}


@router.get("/me/doctors", response_model=List[clinical_schema.DoctorAccessInfo])
async def list_my_doctors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List all doctors with access to the patient's records."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")
    
    result = await db.execute(
        select(PatientProfile).filter(PatientProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    result = await db.execute(
        select(DoctorPatientAccess, User, DoctorProfile)
        .join(User, DoctorPatientAccess.doctor_id == User.id)
        .join(DoctorProfile, DoctorProfile.user_id == User.id, isouter=True)
        .where(DoctorPatientAccess.patient_profile_id == profile.id)
    )
    
    doctors = []
    for access, user, doctor_profile in result.all():
        doctors.append(clinical_schema.DoctorAccessInfo(
            access_id=access.id,
            doctor_id=access.doctor_id,
            doctor_name=f"{user.first_name or ''} {user.last_name or ''}".strip() or "Doctor",
            specialty=doctor_profile.specialty if doctor_profile and hasattr(doctor_profile, 'specialty') else None,
            access_level=access.access_level.value,
            access_type=access.access_type.value if hasattr(access, 'access_type') else "PERMANENT",
            granted_at=access.created_at,
        ))
    
    return doctors


@router.delete("/me/doctors/{access_id}")
async def revoke_doctor_access_by_id(
    access_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Revoke a specific doctor's access to the patient's records."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Not a patient")
    
    import uuid as uuid_module
    try:
        access_uuid = uuid_module.UUID(access_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid access ID")
    
    # Get patient profile
    result = await db.execute(
        select(PatientProfile).filter(PatientProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    # Find and delete access
    result = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.id == access_uuid,
                DoctorPatientAccess.patient_profile_id == profile.id
            )
        )
    )
    access = result.scalar_one_or_none()
    
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")
    
    await db.delete(access)
    await db.commit()
    
    return {"message": "Doctor access revoked"}

