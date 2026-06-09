"""
Patient Health Data Endpoints

Endpoints for managing patient health data: allergies, conditions,
medications, personal references, habits, and family history.

All endpoints are profile-aware via the shared resolve_patient_profile
dependency, supporting family member profile switching.
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, resolve_patient_profile
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.patient import (
    PatientProfile, Medication, MedicationStatus,
    Condition, PersonalReference, HealthHabit,
    FamilyHistoryCondition, Allergy,
)
from app.schemas import patient as patient_schema

router = APIRouter()


# ==========================
# Helper
# ==========================

async def _get_profile(
    db: AsyncSession,
    current_user: User,
    profile_id: Optional[str] = None,
) -> PatientProfile:
    """Resolve profile, auto-creating SELF if needed."""
    try:
        return await resolve_patient_profile(db, current_user, profile_id)
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
            return profile
        raise


async def _get_full_profile(
    db: AsyncSession,
    profile: PatientProfile,
) -> PatientProfile:
    """Re-fetch profile with all relationships eagerly loaded."""
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
        )
    )
    return result.scalars().first()


# ==========================
# Allergies
# ==========================

@router.post("/patient/allergies", response_model=patient_schema.PatientProfile)
async def add_patient_allergy(
    *,
    db: AsyncSession = Depends(get_db),
    allergy_in: patient_schema.AllergyCreate,
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None, description="Target patient profile ID"),
) -> Any:
    """Add an allergy to a patient profile."""
    profile = await _get_profile(db, current_user, profile_id)

    allergy = Allergy(
        patient_profile_id=profile.id,
        **allergy_in.dict()
    )
    db.add(allergy)
    await db.commit()
    return await _get_full_profile(db, profile)


@router.patch("/patient/allergies/{allergy_id}", response_model=patient_schema.Allergy)
async def update_patient_allergy(
    *,
    allergy_id: int,
    allergy_in: patient_schema.AllergyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> Any:
    """Update an allergy on a patient profile."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(Allergy).filter(
            Allergy.id == allergy_id,
            Allergy.patient_profile_id == profile.id,
            Allergy.deleted == False,
        )
    )
    allergy = result.scalars().first()
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy not found")

    update_data = allergy_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(allergy, field, value)

    await db.commit()
    await db.refresh(allergy)
    return allergy


@router.delete("/patient/allergies/{allergy_id}", status_code=204)
async def delete_patient_allergy(
    *,
    allergy_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> None:
    """Soft-delete an allergy from a patient profile."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(Allergy).filter(
            Allergy.id == allergy_id,
            Allergy.patient_profile_id == profile.id,
            Allergy.deleted == False,
        )
    )
    allergy = result.scalars().first()
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy not found")

    from datetime import datetime as dt
    allergy.deleted = True
    allergy.deleted_at = dt.utcnow()
    await db.commit()


# ==========================
# Conditions
# ==========================

@router.post("/patient/conditions", response_model=patient_schema.PatientProfile)
async def add_patient_condition(
    *,
    db: AsyncSession = Depends(get_db),
    condition_in: patient_schema.ConditionCreate,
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> Any:
    """Add a condition to a patient profile."""
    profile = await _get_profile(db, current_user, profile_id)

    condition = Condition(
        patient_profile_id=profile.id,
        **condition_in.dict()
    )
    db.add(condition)
    await db.commit()
    return await _get_full_profile(db, profile)


@router.patch("/patient/conditions/{condition_id}", response_model=patient_schema.Condition)
async def update_patient_condition(
    *,
    condition_id: int,
    condition_in: patient_schema.ConditionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> Any:
    """Update a condition on a patient profile."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(Condition).filter(
            Condition.id == condition_id,
            Condition.patient_profile_id == profile.id,
            Condition.deleted == False,
        )
    )
    condition = result.scalars().first()
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")

    update_data = condition_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(condition, field, value)

    await db.commit()
    await db.refresh(condition)
    return condition


@router.delete("/patient/conditions/{condition_id}", status_code=204)
async def delete_patient_condition(
    *,
    condition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> None:
    """Soft-delete a condition from a patient profile."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(Condition).filter(
            Condition.id == condition_id,
            Condition.patient_profile_id == profile.id,
            Condition.deleted == False,
        )
    )
    condition = result.scalars().first()
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")

    from datetime import datetime as dt
    condition.deleted = True
    condition.deleted_at = dt.utcnow()
    await db.commit()


# ==========================
# Personal References
# ==========================

@router.post("/patient/references", response_model=patient_schema.PersonalReference)
async def create_personal_reference(
    *,
    db: AsyncSession = Depends(get_db),
    ref_in: patient_schema.PersonalReferenceCreate,
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> Any:
    """Add a personal reference to a patient profile (max 3)."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(PatientProfile)
        .filter(PatientProfile.id == profile.id)
        .options(selectinload(PatientProfile.personal_references))
    )
    loaded = result.scalars().first()
    if loaded and len(loaded.personal_references) >= 3:
        raise HTTPException(status_code=400, detail="Máximo 3 referencias personales permitidas")

    reference = PersonalReference(
        patient_profile_id=profile.id,
        **ref_in.dict()
    )
    db.add(reference)
    await db.commit()
    await db.refresh(reference)
    return reference


@router.put("/patient/references/{ref_id}", response_model=patient_schema.PersonalReference)
async def update_personal_reference(
    *,
    ref_id: int,
    ref_in: patient_schema.PersonalReferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> Any:
    """Update a personal reference."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(PersonalReference).filter(
            PersonalReference.id == ref_id,
            PersonalReference.patient_profile_id == profile.id,
        )
    )
    reference = result.scalars().first()
    if not reference:
        raise HTTPException(status_code=404, detail="Reference not found")

    update_data = ref_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reference, field, value)

    await db.commit()
    await db.refresh(reference)
    return reference


@router.delete("/patient/references/{ref_id}", status_code=204)
async def delete_personal_reference(
    *,
    ref_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> None:
    """Delete a personal reference."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(PersonalReference).filter(
            PersonalReference.id == ref_id,
            PersonalReference.patient_profile_id == profile.id,
        )
    )
    reference = result.scalars().first()
    if not reference:
        raise HTTPException(status_code=404, detail="Reference not found")

    await db.delete(reference)
    await db.commit()


# ==========================
# Health Habits
# ==========================

@router.get("/patient/habits", response_model=patient_schema.HealthHabit | None)
async def get_patient_habits(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Get the patient's health habits."""
    profile = await _get_profile(db, current_user, profile_id)
    result = await db.execute(
        select(HealthHabit).where(HealthHabit.patient_profile_id == profile.id)
    )
    return result.scalars().first()


@router.put("/patient/habits", response_model=patient_schema.HealthHabit)
async def upsert_patient_habits(
    *,
    db: AsyncSession = Depends(get_db),
    habits_in: patient_schema.HealthHabitUpsert,
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Create or update the patient's health habits."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(HealthHabit).where(HealthHabit.patient_profile_id == profile.id)
    )
    existing = result.scalars().first()
    update_data = habits_in.model_dump(exclude_unset=True)

    if existing:
        for key, value in update_data.items():
            setattr(existing, key, value)
        await db.commit()
        await db.refresh(existing)
        return existing
    else:
        new_habit = HealthHabit(patient_profile_id=profile.id, **update_data)
        db.add(new_habit)
        await db.commit()
        await db.refresh(new_habit)
        return new_habit


# ==========================
# Family History
# ==========================

@router.get("/patient/family-history", response_model=List[patient_schema.FamilyHistoryConditionResponse])
async def get_family_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Get patient's family history conditions."""
    profile = await _get_profile(db, current_user, profile_id)
    result = await db.execute(
        select(FamilyHistoryCondition).where(
            FamilyHistoryCondition.patient_profile_id == profile.id
        )
    )
    return result.scalars().all()


@router.post("/patient/family-history", response_model=patient_schema.FamilyHistoryConditionResponse)
async def create_family_history_condition(
    *,
    db: AsyncSession = Depends(get_db),
    condition_in: patient_schema.FamilyHistoryConditionCreate,
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Add a family history condition."""
    profile = await _get_profile(db, current_user, profile_id)

    new_condition = FamilyHistoryCondition(
        patient_profile_id=profile.id,
        condition_name=condition_in.condition_name,
        family_members=condition_in.family_members,
        notes=condition_in.notes,
    )
    db.add(new_condition)
    await db.commit()
    await db.refresh(new_condition)
    return new_condition


@router.put("/patient/family-history/{condition_id}", response_model=patient_schema.FamilyHistoryConditionResponse)
async def update_family_history_condition(
    *,
    condition_id: int,
    condition_in: patient_schema.FamilyHistoryConditionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Update a family history condition."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(FamilyHistoryCondition).where(
            FamilyHistoryCondition.id == condition_id,
            FamilyHistoryCondition.patient_profile_id == profile.id,
        )
    )
    condition = result.scalars().first()
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")

    update_data = condition_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(condition, key, value)

    await db.commit()
    await db.refresh(condition)
    return condition


@router.delete("/patient/family-history/{condition_id}", status_code=204)
async def delete_family_history_condition(
    *,
    condition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Delete a family history condition."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(FamilyHistoryCondition).where(
            FamilyHistoryCondition.id == condition_id,
            FamilyHistoryCondition.patient_profile_id == profile.id,
        )
    )
    condition = result.scalars().first()
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")

    await db.delete(condition)
    await db.commit()


# ==========================
# Medications
# ==========================

@router.post("/patient/medications", response_model=patient_schema.Medication)
async def create_patient_medication(
    *,
    db: AsyncSession = Depends(get_db),
    medication_in: patient_schema.MedicationCreate,
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> Any:
    """Create a new medication for a patient profile."""
    profile = await _get_profile(db, current_user, profile_id)

    medication_data = medication_in.dict()
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
    current_user: User = Depends(get_current_user),
    status: patient_schema.MedicationStatus = None,
    condition_id: int = None,
    profile_id: Optional[str] = Query(None),
) -> Any:
    """Get all medications for a patient profile."""
    profile = await _get_profile(db, current_user, profile_id)

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
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> Any:
    """Get only currently active medications."""
    profile = await _get_profile(db, current_user, profile_id)

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
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> Any:
    """Get a specific medication by ID."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(Medication).filter(
            Medication.id == medication_id,
            Medication.patient_profile_id == profile.id,
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
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> Any:
    """Update a medication."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(Medication).filter(
            Medication.id == medication_id,
            Medication.patient_profile_id == profile.id,
        )
    )
    medication = result.scalars().first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

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
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> None:
    """Delete a medication."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(Medication).filter(
            Medication.id == medication_id,
            Medication.patient_profile_id == profile.id,
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
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> Any:
    """Get all medications linked to a specific condition."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(select(Condition).filter(Condition.id == condition_id))
    condition = result.scalars().first()
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")
    if condition.patient_profile_id != profile.id:
        raise HTTPException(status_code=403, detail="Access denied")

    medications = await db.execute(
        select(Medication).filter(
            Medication.condition_id == condition_id
        ).order_by(Medication.recorded_at.desc())
    )
    return medications.scalars().all()


# ==========================
# Patient Locations
# ==========================

from app.models.patient_location import PatientLocation
from app.schemas import patient_location as loc_schema


@router.get("/patient/locations", response_model=List[loc_schema.PatientLocationResponse])
async def get_patient_locations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """List all saved locations for a patient profile."""
    profile = await _get_profile(db, current_user, profile_id)
    result = await db.execute(
        select(PatientLocation)
        .where(PatientLocation.patient_profile_id == profile.id)
        .order_by(PatientLocation.is_default.desc(), PatientLocation.created_at.desc())
    )
    return result.scalars().all()


@router.post("/patient/locations", response_model=loc_schema.PatientLocationResponse)
async def create_patient_location(
    *,
    db: AsyncSession = Depends(get_db),
    location_in: loc_schema.PatientLocationCreate,
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Add a saved location to a patient profile (max 5)."""
    profile = await _get_profile(db, current_user, profile_id)

    # Enforce limit
    count_result = await db.execute(
        select(PatientLocation)
        .where(PatientLocation.patient_profile_id == profile.id)
    )
    if len(count_result.scalars().all()) >= 5:
        raise HTTPException(status_code=400, detail="Máximo 5 ubicaciones permitidas")

    # If this is the first location or marked as default, clear other defaults
    if location_in.is_default:
        await _clear_default_locations(db, profile.id)

    location = PatientLocation(
        patient_profile_id=profile.id,
        **location_in.model_dump()
    )
    db.add(location)
    await db.commit()
    await db.refresh(location)
    return location


@router.put("/patient/locations/{location_id}", response_model=loc_schema.PatientLocationResponse)
async def update_patient_location(
    *,
    location_id: int,
    location_in: loc_schema.PatientLocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Update a saved location."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(PatientLocation).filter(
            PatientLocation.id == location_id,
            PatientLocation.patient_profile_id == profile.id,
        )
    )
    location = result.scalars().first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    update_data = location_in.model_dump(exclude_unset=True)

    # If setting as default, clear other defaults first
    if update_data.get("is_default"):
        await _clear_default_locations(db, profile.id)

    for field, value in update_data.items():
        setattr(location, field, value)

    await db.commit()
    await db.refresh(location)
    return location


@router.delete("/patient/locations/{location_id}", status_code=204)
async def delete_patient_location(
    *,
    location_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
) -> None:
    """Delete a saved location."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(PatientLocation).filter(
            PatientLocation.id == location_id,
            PatientLocation.patient_profile_id == profile.id,
        )
    )
    location = result.scalars().first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    await db.delete(location)
    await db.commit()


@router.put("/patient/locations/{location_id}/default", response_model=loc_schema.PatientLocationResponse)
async def set_default_location(
    *,
    location_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
):
    """Mark a location as the default."""
    profile = await _get_profile(db, current_user, profile_id)

    result = await db.execute(
        select(PatientLocation).filter(
            PatientLocation.id == location_id,
            PatientLocation.patient_profile_id == profile.id,
        )
    )
    location = result.scalars().first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    await _clear_default_locations(db, profile.id)
    location.is_default = True
    await db.commit()
    await db.refresh(location)
    return location


async def _clear_default_locations(db: AsyncSession, profile_id) -> None:
    """Reset is_default on all locations for a profile."""
    from sqlalchemy import update
    await db.execute(
        update(PatientLocation)
        .where(PatientLocation.patient_profile_id == profile_id)
        .values(is_default=False)
    )

