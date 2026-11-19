"""Patient management: create, list, health profile, personal info."""
import uuid
from enum import Enum
from typing import Annotated, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_db
from app.api.pagination import (
    PaginationParams,
    count_rows,
    pagination_dependency,
    set_pagination_headers,
)
from app.models.user import User, DoctorPatientAccess, DoctorAccessLevel
from app.models.patient import PatientProfile
from app.models.patient_location import PatientLocation
from app.schemas import clinical as clinical_schema
from app.schemas import patient as patient_schema
from app.schemas import patient_location as loc_schema

from ._helpers import require_doctor_role, get_doctor_patient_access

router = APIRouter()
patient_list_pagination = pagination_dependency(default_limit=140, max_limit=140)


class PatientSort(str, Enum):
    NAME_ASC = "name_asc"
    NAME_DESC = "name_desc"
    RECENT = "recent"


@router.post("/patients/create", response_model=clinical_schema.CreatePatientResponse)
async def create_patient(
    patient_in: clinical_schema.CreatePatientRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Create a standalone patient profile (no user account).
    Doctor gets automatic WRITE access.
    """
    from datetime import date as date_type

    dob = None
    if patient_in.date_of_birth:
        try:
            dob = date_type.fromisoformat(patient_in.date_of_birth)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")

    profile = PatientProfile(
        first_name=patient_in.first_name,
        last_name=patient_in.last_name,
        date_of_birth=dob,
        email=patient_in.email,
        phone=patient_in.phone,
        dni=patient_in.dni,
        created_by_doctor_id=current_user.id,
    )
    db.add(profile)
    await db.flush()

    access = DoctorPatientAccess(
        doctor_id=current_user.id,
        patient_profile_id=profile.id,
        access_level=DoctorAccessLevel.WRITE,
        granted_by=current_user.id,
    )
    db.add(access)
    await db.commit()
    await db.refresh(profile)

    activation_email_sent = False
    if patient_in.email:
        try:
            from app.services.email import send_patient_activation_email
            import logging
            doctor_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "Tu médico"
            await send_patient_activation_email(patient_in.email, doctor_name)
            activation_email_sent = True
        except Exception as e:
            logging.getLogger(__name__).error(f"Failed to send activation email: {e}")

    return clinical_schema.CreatePatientResponse(
        patient_id=profile.id,
        first_name=profile.first_name,
        last_name=profile.last_name,
        email=profile.email,
        activation_email_sent=activation_email_sent,
        message="Paciente creado exitosamente",
    )


@router.get("/patients", response_model=List[clinical_schema.PatientAccessSummary])
async def list_my_patients(
    response: Response,
    pagination: Annotated[PaginationParams, Depends(patient_list_pagination)],
    q: Optional[str] = Query(None, max_length=200, description="Buscar paciente"),
    sort: PatientSort = Query(PatientSort.NAME_ASC, description="Orden del listado"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """List patients with server-side search, ordering, and pagination."""
    first_name = func.coalesce(PatientProfile.first_name, User.first_name, "")
    last_name = func.coalesce(PatientProfile.last_name, User.last_name, "")
    email = func.coalesce(PatientProfile.email, User.email, "")

    stmt = (
        select(DoctorPatientAccess, PatientProfile, User)
        .join(PatientProfile, DoctorPatientAccess.patient_profile_id == PatientProfile.id)
        .join(User, PatientProfile.user_id == User.id, isouter=True)
        .where(DoctorPatientAccess.doctor_id == current_user.id)
    )

    normalized_query = q.strip().lower() if q else ""
    if normalized_query:
        pattern = f"%{normalized_query}%"
        full_name = func.lower(func.concat(first_name, " ", last_name))
        stmt = stmt.where(
            or_(
                full_name.like(pattern),
                func.lower(first_name).like(pattern),
                func.lower(last_name).like(pattern),
                func.lower(email).like(pattern),
                func.lower(func.coalesce(PatientProfile.dni, "")).like(pattern),
                func.lower(func.coalesce(PatientProfile.phone, "")).like(pattern),
            )
        )

    total = await count_rows(db, stmt)
    set_pagination_headers(
        response,
        total=total,
        skip=pagination.skip,
        limit=pagination.limit,
    )

    normalized_first_name = func.lower(first_name)
    normalized_last_name = func.lower(last_name)
    if sort == PatientSort.RECENT:
        order_by = (
            DoctorPatientAccess.created_at.desc(),
            DoctorPatientAccess.id.desc(),
        )
    elif sort == PatientSort.NAME_DESC:
        order_by = (
            normalized_first_name.desc(),
            normalized_last_name.desc(),
            PatientProfile.id.desc(),
        )
    else:
        order_by = (
            normalized_first_name.asc(),
            normalized_last_name.asc(),
            PatientProfile.id.asc(),
        )

    result = await db.execute(
        stmt.order_by(*order_by)
        .offset(pagination.skip)
        .limit(pagination.limit)
    )

    patients = []
    for access, profile, user in result.all():
        patients.append(clinical_schema.PatientAccessSummary(
            patient_id=profile.id,
            first_name=profile.first_name or (user.first_name if user else "Unknown"),
            last_name=profile.last_name or (user.last_name if user else "Patient"),
            date_of_birth=profile.date_of_birth,
            sex=profile.sex or (user.sex.value if user and user.sex else None),
            blood_type=profile.blood_type,
            email=profile.email or (user.email if user else None),
            phone=profile.phone,
            address=profile.address,
            has_account=user is not None,
            dni=profile.dni,
            city=profile.city or (user.city if user else None),
            country=profile.country or (user.country if user else None),
            access_level=access.access_level,
            granted_at=access.created_at,
        ))

    return patients


@router.get("/patients/{patient_profile_id}/health")
async def get_patient_health_profile(
    patient_profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Get patient health profile: medications, allergies, conditions, habits, family history."""
    from app.models.patient import (
        Medication, Allergy, Condition,
        HealthHabit, FamilyHistoryCondition, Surgery, Vaccine
    )

    await get_doctor_patient_access(patient_profile_id, db, current_user)

    meds_result = await db.execute(
        select(Medication).where(
            Medication.patient_profile_id == patient_profile_id,
        ).order_by(
            (Medication.status != 'ACTIVE').asc(),
            Medication.name.asc(),
        )
    )
    medications = meds_result.scalars().all()

    allergies_result = await db.execute(
        select(Allergy).where(
            Allergy.patient_profile_id == patient_profile_id,
            Allergy.deleted == False,
        )
    )
    allergies = allergies_result.scalars().all()

    conditions_result = await db.execute(
        select(Condition).where(
            Condition.patient_profile_id == patient_profile_id,
            Condition.deleted == False,
        )
    )
    conditions = conditions_result.scalars().all()

    habit_result = await db.execute(
        select(HealthHabit).where(
            HealthHabit.patient_profile_id == patient_profile_id
        )
    )
    habit = habit_result.scalar_one_or_none()

    fh_result = await db.execute(
        select(FamilyHistoryCondition).where(
            FamilyHistoryCondition.patient_profile_id == patient_profile_id
        )
    )
    family_history = fh_result.scalars().all()

    loc_result = await db.execute(
        select(PatientLocation).where(
            PatientLocation.patient_profile_id == patient_profile_id
        ).order_by(PatientLocation.is_default.desc())
    )
    locations = loc_result.scalars().all()

    surgeries_result = await db.execute(
        select(Surgery).where(
            Surgery.patient_profile_id == patient_profile_id,
            Surgery.deleted == False,
        )
    )
    surgeries = surgeries_result.scalars().all()

    vaccines_result = await db.execute(
        select(Vaccine).where(
            Vaccine.patient_profile_id == patient_profile_id,
            Vaccine.deleted == False,
        )
    )
    vaccines = vaccines_result.scalars().all()

    return {
        "medications": [
            {
                "id": m.id, "name": m.name, "dosage": m.dosage,
                "frequency": m.frequency, "route": m.route,
                "status": m.status.value if m.status else None,
                "status_reason": m.status_reason,
                "start_date": m.start_date.isoformat() if m.start_date else None,
                "end_date": m.end_date.isoformat() if m.end_date else None,
                "source": m.source.value if m.source else None,
                "condition_id": m.condition_id,
                "instructions": m.instructions, "notes": m.notes,
                "recorded_at": m.recorded_at.isoformat() if m.recorded_at else None,
            }
            for m in medications
        ],
        "allergies": [
            {
                "id": a.id, "allergen": a.allergen, "code": a.code,
                "code_system": a.code_system,
                "type": a.type.value if a.type else None,
                "reaction": a.reaction,
                "severity": a.severity.value if a.severity else None,
                "source": a.source.value if a.source else None,
                "status": a.status.value if a.status else None,
            }
            for a in allergies
        ],
        "conditions": [
            {
                "id": c.id, "name": c.name, "code": c.code,
                "code_system": c.code_system,
                "status": c.status.value if c.status else None,
                "source": c.source.value if c.source else None,
                "since_year": c.since_year, "notes": c.notes,
            }
            for c in conditions
        ],
        "health_habit": {
            "id": habit.id,
            "tobacco_use": habit.tobacco_use.value if habit.tobacco_use else None,
            "cigarettes_per_day": habit.cigarettes_per_day,
            "years_smoking": habit.years_smoking,
            "years_since_quit": habit.years_since_quit,
            "alcohol_use": habit.alcohol_use.value if habit.alcohol_use else None,
            "drinks_per_week": habit.drinks_per_week,
            "drug_use": habit.drug_use, "drug_type": habit.drug_type,
            "drug_frequency": habit.drug_frequency,
            "physical_activity": habit.physical_activity.value if habit.physical_activity else None,
            "diet": habit.diet.value if habit.diet else None,
            "sleep_hours": habit.sleep_hours, "sleep_problems": habit.sleep_problems,
            "observations": habit.observations,
        } if habit else None,
        "family_history": [
            {
                "id": fh.id, "condition_name": fh.condition_name,
                "family_members": fh.family_members, "notes": fh.notes,
            }
            for fh in family_history
        ],
        "locations": [
            {
                "id": loc.id, "label": loc.label,
                "latitude": loc.latitude, "longitude": loc.longitude,
                "address": loc.address, "notes": loc.notes,
                "is_default": loc.is_default,
                "created_at": loc.created_at.isoformat() if loc.created_at else None,
            }
            for loc in locations
        ],
        "surgeries": [
            {
                "id": s.id, "name": s.name,
                "date_str": s.date_str, "hospital": s.hospital,
                "notes": s.notes,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in surgeries
        ],
        "vaccines": [
            {
                "id": v.id, "vaccine_name": v.vaccine_name,
                "code": v.code, "code_system": v.code_system,
                "dose_number": v.dose_number,
                "date_administered": v.date_administered.isoformat() if v.date_administered else None,
                "administered_by": v.administered_by,
                "lot_number": v.lot_number, "site": v.site,
                "notes": v.notes,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in vaccines
        ],
    }


@router.put("/patients/{patient_profile_id}/personal-info")
async def update_patient_personal_info(
    patient_profile_id: uuid.UUID,
    profile_in: patient_schema.PatientProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
) -> Any:
    """Update a patient's personal info (demographics). Requires WRITE access."""
    await get_doctor_patient_access(patient_profile_id, db, current_user, require_write=True)

    result = await db.execute(
        select(PatientProfile).where(PatientProfile.id == patient_profile_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    update_data = profile_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)

    return {
        "id": str(profile.id),
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "date_of_birth": profile.date_of_birth.isoformat() if profile.date_of_birth else None,
        "sex": profile.sex,
        "blood_type": profile.blood_type,
        "dni": profile.dni,
        "phone": profile.phone,
        "address": profile.address,
        "city": profile.city,
        "country": profile.country,
    }


@router.get(
    "/patients/{patient_profile_id}/locations",
    response_model=List[loc_schema.PatientLocationResponse],
)
async def get_patient_locations(
    patient_profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Get saved locations for a patient (doctor view)."""
    await get_doctor_patient_access(patient_profile_id, db, current_user)

    result = await db.execute(
        select(PatientLocation)
        .where(PatientLocation.patient_profile_id == patient_profile_id)
        .order_by(PatientLocation.is_default.desc(), PatientLocation.created_at.desc())
    )
    return result.scalars().all()
