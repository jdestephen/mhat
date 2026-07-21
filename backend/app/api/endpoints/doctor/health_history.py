"""Health history CRUD: conditions, allergies, medications, habits, family history."""
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_db
from app.models.user import User
from app.models.patient import (
    Condition as ConditionModel,
    Allergy as AllergyModel,
    Medication as MedicationModel,
    HealthHabit,
    FamilyHistoryCondition,
    Surgery,
    Vaccine,
)
from app.schemas import patient as patient_schema

from ._helpers import require_doctor_role, get_doctor_patient_access

router = APIRouter()


# --- Conditions ---

@router.post("/patients/{patient_id}/conditions", response_model=patient_schema.Condition)
async def doctor_add_condition(
    patient_id: uuid.UUID,
    condition_in: patient_schema.ConditionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor adds a condition to a patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    condition = ConditionModel(patient_profile_id=patient_id, **condition_in.model_dump())
    db.add(condition)
    await db.commit()
    await db.refresh(condition)
    return condition


@router.patch("/patients/{patient_id}/conditions/{condition_id}", response_model=patient_schema.Condition)
async def doctor_update_condition(
    patient_id: uuid.UUID,
    condition_id: int,
    condition_in: patient_schema.ConditionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor updates a condition on a patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    result = await db.execute(
        select(ConditionModel).filter(
            ConditionModel.id == condition_id,
            ConditionModel.patient_profile_id == patient_id,
            ConditionModel.deleted == False,
        )
    )
    condition = result.scalars().first()
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")
    for field, value in condition_in.model_dump(exclude_unset=True).items():
        setattr(condition, field, value)
    await db.commit()
    await db.refresh(condition)
    return condition


@router.delete("/patients/{patient_id}/conditions/{condition_id}", status_code=204)
async def doctor_delete_condition(
    patient_id: uuid.UUID,
    condition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> None:
    """Doctor soft-deletes a condition from patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    result = await db.execute(
        select(ConditionModel).filter(
            ConditionModel.id == condition_id,
            ConditionModel.patient_profile_id == patient_id,
            ConditionModel.deleted == False,
        )
    )
    condition = result.scalars().first()
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")
    condition.deleted = True
    condition.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# --- Surgeries ---

@router.post("/patients/{patient_id}/surgeries", response_model=patient_schema.Surgery)
async def doctor_add_surgery(
    patient_id: uuid.UUID,
    surgery_in: patient_schema.SurgeryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor adds a surgery to a patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    surgery = Surgery(patient_profile_id=patient_id, **surgery_in.model_dump())
    db.add(surgery)
    await db.commit()
    await db.refresh(surgery)
    return surgery


@router.patch("/patients/{patient_id}/surgeries/{surgery_id}", response_model=patient_schema.Surgery)
async def doctor_update_surgery(
    patient_id: uuid.UUID,
    surgery_id: int,
    surgery_in: patient_schema.SurgeryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor updates a surgery on a patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    result = await db.execute(
        select(Surgery).filter(
            Surgery.id == surgery_id,
            Surgery.patient_profile_id == patient_id,
            Surgery.deleted == False,
        )
    )
    surgery = result.scalars().first()
    if not surgery:
        raise HTTPException(status_code=404, detail="Surgery not found")
    for field, value in surgery_in.model_dump(exclude_unset=True).items():
        setattr(surgery, field, value)
    await db.commit()
    await db.refresh(surgery)
    return surgery


@router.delete("/patients/{patient_id}/surgeries/{surgery_id}", status_code=204)
async def doctor_delete_surgery(
    patient_id: uuid.UUID,
    surgery_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> None:
    """Doctor soft-deletes a surgery from patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    result = await db.execute(
        select(Surgery).filter(
            Surgery.id == surgery_id,
            Surgery.patient_profile_id == patient_id,
            Surgery.deleted == False,
        )
    )
    surgery = result.scalars().first()
    if not surgery:
        raise HTTPException(status_code=404, detail="Surgery not found")
    surgery.deleted = True
    surgery.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# --- Allergies ---

@router.post("/patients/{patient_id}/allergies", response_model=patient_schema.Allergy)
async def doctor_add_allergy(
    patient_id: uuid.UUID,
    allergy_in: patient_schema.AllergyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor adds an allergy to a patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    allergy = AllergyModel(patient_profile_id=patient_id, **allergy_in.model_dump())
    db.add(allergy)
    await db.commit()
    await db.refresh(allergy)
    return allergy


@router.patch("/patients/{patient_id}/allergies/{allergy_id}", response_model=patient_schema.Allergy)
async def doctor_update_allergy(
    patient_id: uuid.UUID,
    allergy_id: int,
    allergy_in: patient_schema.AllergyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor updates an allergy on a patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    result = await db.execute(
        select(AllergyModel).filter(
            AllergyModel.id == allergy_id,
            AllergyModel.patient_profile_id == patient_id,
            AllergyModel.deleted == False,
        )
    )
    allergy = result.scalars().first()
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy not found")
    for field, value in allergy_in.model_dump(exclude_unset=True).items():
        setattr(allergy, field, value)
    await db.commit()
    await db.refresh(allergy)
    return allergy


@router.delete("/patients/{patient_id}/allergies/{allergy_id}", status_code=204)
async def doctor_delete_allergy(
    patient_id: uuid.UUID,
    allergy_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> None:
    """Doctor soft-deletes an allergy from patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    result = await db.execute(
        select(AllergyModel).filter(
            AllergyModel.id == allergy_id,
            AllergyModel.patient_profile_id == patient_id,
            AllergyModel.deleted == False,
        )
    )
    allergy = result.scalars().first()
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy not found")
    allergy.deleted = True
    allergy.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# --- Medications ---

@router.post("/patients/{patient_id}/medications", response_model=patient_schema.Medication)
async def doctor_add_medication(
    patient_id: uuid.UUID,
    med_in: patient_schema.MedicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor adds a medication to a patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    med = MedicationModel(patient_profile_id=patient_id, created_by_id=current_user.id, **med_in.model_dump())
    db.add(med)
    await db.commit()
    await db.refresh(med)
    return med


@router.patch("/patients/{patient_id}/medications/{med_id}", response_model=patient_schema.Medication)
async def doctor_update_medication(
    patient_id: uuid.UUID,
    med_id: int,
    med_in: patient_schema.MedicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor updates a medication on patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    result = await db.execute(
        select(MedicationModel).filter(
            MedicationModel.id == med_id,
            MedicationModel.patient_profile_id == patient_id,
        )
    )
    med = result.scalars().first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    for field, value in med_in.model_dump(exclude_unset=True).items():
        setattr(med, field, value)
    await db.commit()
    await db.refresh(med)
    return med


@router.delete("/patients/{patient_id}/medications/{med_id}", status_code=204)
async def doctor_delete_medication(
    patient_id: uuid.UUID,
    med_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> None:
    """Doctor deletes a medication from patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    result = await db.execute(
        select(MedicationModel).filter(
            MedicationModel.id == med_id,
            MedicationModel.patient_profile_id == patient_id,
        )
    )
    med = result.scalars().first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    await db.delete(med)
    await db.commit()


# --- Health Habits ---

@router.get("/patients/{patient_id}/habits", response_model=patient_schema.HealthHabit | None)
async def doctor_get_habits(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor gets a patient's health habits."""
    await get_doctor_patient_access(patient_id, db, current_user)
    result = await db.execute(
        select(HealthHabit).filter(HealthHabit.patient_profile_id == patient_id)
    )
    return result.scalars().first()


@router.put("/patients/{patient_id}/habits", response_model=patient_schema.HealthHabit)
async def doctor_upsert_habits(
    patient_id: uuid.UUID,
    habits_in: patient_schema.HealthHabitUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor creates/updates a patient's health habits."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    result = await db.execute(
        select(HealthHabit).filter(HealthHabit.patient_profile_id == patient_id)
    )
    existing = result.scalars().first()
    update_data = habits_in.model_dump(exclude_unset=True)
    if existing:
        for field, value in update_data.items():
            setattr(existing, field, value)
        await db.commit()
        await db.refresh(existing)
        return existing
    else:
        habit = HealthHabit(patient_profile_id=patient_id, **update_data)
        db.add(habit)
        await db.commit()
        await db.refresh(habit)
        return habit


# --- Family History ---

@router.get("/patients/{patient_id}/family-history", response_model=list[patient_schema.FamilyHistoryConditionResponse])
async def doctor_get_family_history(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor gets a patient's family history conditions."""
    await get_doctor_patient_access(patient_id, db, current_user)
    result = await db.execute(
        select(FamilyHistoryCondition).filter(
            FamilyHistoryCondition.patient_profile_id == patient_id
        )
    )
    return result.scalars().all()


@router.post("/patients/{patient_id}/family-history", response_model=patient_schema.FamilyHistoryConditionResponse)
async def doctor_add_family_history(
    patient_id: uuid.UUID,
    fh_in: patient_schema.FamilyHistoryConditionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor adds a family history condition."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    condition = FamilyHistoryCondition(
        patient_profile_id=patient_id,
        condition_name=fh_in.condition_name,
        family_members=fh_in.family_members,
        notes=fh_in.notes,
    )
    db.add(condition)
    await db.commit()
    await db.refresh(condition)
    return condition


@router.put("/patients/{patient_id}/family-history/{condition_id}", response_model=patient_schema.FamilyHistoryConditionResponse)
async def doctor_update_family_history(
    patient_id: uuid.UUID,
    condition_id: int,
    fh_in: patient_schema.FamilyHistoryConditionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor updates a family history condition."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    result = await db.execute(
        select(FamilyHistoryCondition).filter(
            FamilyHistoryCondition.id == condition_id,
            FamilyHistoryCondition.patient_profile_id == patient_id,
        )
    )
    condition = result.scalars().first()
    if not condition:
        raise HTTPException(status_code=404, detail="Family history condition not found")
    for field, value in fh_in.model_dump(exclude_unset=True).items():
        setattr(condition, field, value)
    await db.commit()
    await db.refresh(condition)
    return condition


@router.delete("/patients/{patient_id}/family-history/{condition_id}", status_code=204)
async def doctor_delete_family_history(
    patient_id: uuid.UUID,
    condition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> None:
    """Doctor deletes a family history condition."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    result = await db.execute(
        select(FamilyHistoryCondition).filter(
            FamilyHistoryCondition.id == condition_id,
            FamilyHistoryCondition.patient_profile_id == patient_id,
        )
    )
    condition = result.scalars().first()
    if not condition:
        raise HTTPException(status_code=404, detail="Family history condition not found")
    await db.delete(condition)
    await db.commit()


# --- Vaccines ---

@router.post("/patients/{patient_id}/vaccines", response_model=patient_schema.Vaccine)
async def doctor_add_vaccine(
    patient_id: uuid.UUID,
    vaccine_in: patient_schema.VaccineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor adds a vaccine to a patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    vaccine = Vaccine(patient_profile_id=patient_id, **vaccine_in.model_dump())
    db.add(vaccine)
    await db.commit()
    await db.refresh(vaccine)
    return vaccine


@router.patch("/patients/{patient_id}/vaccines/{vaccine_id}", response_model=patient_schema.Vaccine)
async def doctor_update_vaccine(
    patient_id: uuid.UUID,
    vaccine_id: int,
    vaccine_in: patient_schema.VaccineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Doctor updates a vaccine on a patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    result = await db.execute(
        select(Vaccine).filter(
            Vaccine.id == vaccine_id,
            Vaccine.patient_profile_id == patient_id,
            Vaccine.deleted == False,
        )
    )
    vaccine = result.scalars().first()
    if not vaccine:
        raise HTTPException(status_code=404, detail="Vaccine not found")
    for field, value in vaccine_in.model_dump(exclude_unset=True).items():
        setattr(vaccine, field, value)
    await db.commit()
    await db.refresh(vaccine)
    return vaccine


@router.delete("/patients/{patient_id}/vaccines/{vaccine_id}", status_code=204)
async def doctor_delete_vaccine(
    patient_id: uuid.UUID,
    vaccine_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> None:
    """Doctor soft-deletes a vaccine from patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    result = await db.execute(
        select(Vaccine).filter(
            Vaccine.id == vaccine_id,
            Vaccine.patient_profile_id == patient_id,
            Vaccine.deleted == False,
        )
    )
    vaccine = result.scalars().first()
    if not vaccine:
        raise HTTPException(status_code=404, detail="Vaccine not found")
    vaccine.deleted = True
    vaccine.deleted_at = datetime.now(timezone.utc)
    await db.commit()
