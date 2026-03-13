"""
Doctor API Endpoints

Endpoints for doctor workflow: patient access, medical records, prescriptions, orders.
"""
import uuid
from typing import Any, List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, or_

from app.api import deps
from app.api.deps import get_db
from app.models.user import User, UserRole, DoctorPatientAccess, DoctorAccessLevel
from app.models.patient import PatientProfile
from app.models.hx import MedicalRecord, RecordSource, RecordStatus, MedicalDiagnosis, VitalSigns
from app.models.clinical import Prescription, ClinicalOrder
from app.schemas import clinical as clinical_schema
from app.schemas import hx as hx_schema
from app.schemas import patient as patient_schema

router = APIRouter()


# =====================
# Authorization Helpers
# =====================

async def require_doctor_role(current_user: User = Depends(deps.get_current_user)) -> User:
    """Ensure current user is a doctor."""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Doctor role required")
    return current_user


async def get_doctor_patient_access(
    patient_profile_id: uuid.UUID,
    db: AsyncSession,
    current_user: User,
    require_write: bool = False
) -> DoctorPatientAccess:
    """Get and validate doctor's access to a patient."""
    result = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.doctor_id == current_user.id,
                DoctorPatientAccess.patient_profile_id == patient_profile_id,
            )
        )
    )
    access = result.scalar_one_or_none()
    
    if not access:
        raise HTTPException(status_code=403, detail="No access to this patient")
    
    if require_write and access.access_level != DoctorAccessLevel.WRITE:
        raise HTTPException(status_code=403, detail="Write access required")
    
    return access


# =====================
# Claim Invitation Code
# =====================

@router.post("/claim-access")
async def claim_invitation_code(
    claim_in: clinical_schema.ClaimInvitationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Claim an invitation code to get access to a patient's records.
    The code must be valid (not expired, not revoked, not already claimed).
    """
    from app.models.access_invitation import AccessInvitation

    # Normalize code (uppercase, trim)
    code = claim_in.code.strip().upper()

    result = await db.execute(
        select(AccessInvitation).where(AccessInvitation.code == code)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=404, detail="Código de invitación no encontrado")

    # Validate invitation state
    if invitation.is_revoked:
        raise HTTPException(status_code=400, detail="Esta invitación fue revocada")

    if invitation.claimed_by:
        raise HTTPException(status_code=400, detail="Esta invitación ya fue utilizada")

    if invitation.code_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Esta invitación ha expirado")

    # Check if doctor already has access to this patient
    existing = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.doctor_id == current_user.id,
                DoctorPatientAccess.patient_profile_id == invitation.patient_profile_id
            )
        )
    )
    existing_access = existing.scalar_one_or_none()

    if existing_access:
        # Update existing access level if different
        existing_access.access_level = invitation.access_level
        existing_access.access_type = invitation.access_type
    else:
        # Create new access
        access = DoctorPatientAccess(
            doctor_id=current_user.id,
            patient_profile_id=invitation.patient_profile_id,
            access_level=invitation.access_level,
            access_type=invitation.access_type,
            granted_by=invitation.created_by,
        )
        db.add(access)

    # Mark invitation as claimed
    invitation.claimed_by = current_user.id
    invitation.claimed_at = datetime.now(timezone.utc)

    await db.commit()

    # Return patient info
    result = await db.execute(
        select(PatientProfile, User)
        .join(User, PatientProfile.user_id == User.id, isouter=True)
        .where(PatientProfile.id == invitation.patient_profile_id)
    )
    row = result.first()
    if row:
        profile, user = row
        return {
            "message": "Acceso concedido exitosamente",
            "patient_name": f"{user.first_name or ''} {user.last_name or ''}".strip() if user else f"{profile.first_name or ''} {profile.last_name or ''}".strip(),
            "access_level": invitation.access_level.value,
            "access_type": invitation.access_type.value,
        }

    return {"message": "Acceso concedido exitosamente"}


# =====================
# Patient List Endpoints
# =====================

@router.get("/patients", response_model=List[clinical_schema.PatientAccessSummary])
async def list_my_patients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
    skip: int = 0,
    limit: int = 50,
):
    """
    List all patients the doctor has access to.
    """
    result = await db.execute(
        select(DoctorPatientAccess, PatientProfile, User)
        .join(PatientProfile, DoctorPatientAccess.patient_profile_id == PatientProfile.id)
        .join(User, PatientProfile.user_id == User.id, isouter=True)
        .where(
            DoctorPatientAccess.doctor_id == current_user.id
        )
        .offset(skip)
        .limit(limit)
    )
    
    patients = []
    for access, profile, user in result.all():
        patients.append(clinical_schema.PatientAccessSummary(
            patient_id=profile.id,
            first_name=user.first_name if user else profile.first_name or "Unknown",
            last_name=user.last_name if user else profile.last_name or "Patient",
            date_of_birth=profile.date_of_birth,
            sex=user.sex.value if user and user.sex else None,
            blood_type=profile.blood_type,
            access_level=access.access_level,
            granted_at=access.created_at
        ))
    
    return patients


# =====================
# Access Control Endpoints
# =====================

@router.post("/patients/{patient_profile_id}/access", response_model=clinical_schema.DoctorPatientAccessResponse)
async def grant_patient_access(
    patient_profile_id: uuid.UUID,
    access_level: DoctorAccessLevel = DoctorAccessLevel.WRITE,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Grant doctor access to a patient's records.
    In a clinical setting, this is done when patient presents to the doctor.
    """
    # Check if patient exists
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.id == patient_profile_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check if access already exists
    result = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.doctor_id == current_user.id,
                DoctorPatientAccess.patient_profile_id == patient_profile_id
            )
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        # Update existing access
        existing.access_level = access_level
        await db.commit()
        await db.refresh(existing)
        return existing
    
    # Create new access
    access = DoctorPatientAccess(
        doctor_id=current_user.id,
        patient_profile_id=patient_profile_id,
        access_level=access_level,
        granted_by=current_user.id,  # Self-granted in clinical setting
    )
    db.add(access)
    await db.commit()
    await db.refresh(access)
    
    return access


@router.delete("/patients/{patient_profile_id}/access")
async def revoke_patient_access(
    patient_profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Revoke doctor's access to a patient's records.
    """
    result = await db.execute(
        select(DoctorPatientAccess).where(
            and_(
                DoctorPatientAccess.doctor_id == current_user.id,
                DoctorPatientAccess.patient_profile_id == patient_profile_id
            )
        )
    )
    access = result.scalar_one_or_none()
    
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")
    
    await db.delete(access)
    await db.commit()
    
    return {"message": "Access revoked"}


# =====================
# Patient Health Profile
# =====================

@router.get("/patients/{patient_profile_id}/health")
async def get_patient_health_profile(
    patient_profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Get patient health profile: active medications, allergies, and conditions.
    Requires doctor access to the patient.
    """
    from app.models.patient import (
        Medication, Allergy, Condition, MedicationStatus,
        HealthHabit, FamilyHistoryCondition,
    )

    await get_doctor_patient_access(patient_profile_id, db, current_user)

    # Fetch active medications
    meds_result = await db.execute(
        select(Medication).where(
            Medication.patient_profile_id == patient_profile_id,
            Medication.status == MedicationStatus.ACTIVE,
        )
    )
    medications = meds_result.scalars().all()

    # Fetch allergies (not deleted)
    allergies_result = await db.execute(
        select(Allergy).where(
            Allergy.patient_profile_id == patient_profile_id,
            Allergy.deleted == False,
        )
    )
    allergies = allergies_result.scalars().all()

    # Fetch conditions (not deleted)
    conditions_result = await db.execute(
        select(Condition).where(
            Condition.patient_profile_id == patient_profile_id,
            Condition.deleted == False,
        )
    )
    conditions = conditions_result.scalars().all()

    # Fetch health habit (one-to-one)
    habit_result = await db.execute(
        select(HealthHabit).where(
            HealthHabit.patient_profile_id == patient_profile_id
        )
    )
    habit = habit_result.scalar_one_or_none()

    # Fetch family history conditions
    fh_result = await db.execute(
        select(FamilyHistoryCondition).where(
            FamilyHistoryCondition.patient_profile_id == patient_profile_id
        )
    )
    family_history = fh_result.scalars().all()

    return {
        "medications": [
            {
                "id": m.id,
                "name": m.name,
                "dosage": m.dosage,
                "frequency": m.frequency,
                "instructions": m.instructions,
            }
            for m in medications
        ],
        "allergies": [
            {
                "id": a.id,
                "allergen": a.allergen,
                "code": a.code,
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
                "id": c.id,
                "name": c.name,
                "code": c.code,
                "code_system": c.code_system,
                "status": c.status.value if c.status else None,
                "source": c.source.value if c.source else None,
                "since_year": c.since_year,
                "notes": c.notes,
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
            "drug_use": habit.drug_use,
            "drug_type": habit.drug_type,
            "drug_frequency": habit.drug_frequency,
            "physical_activity": habit.physical_activity.value if habit.physical_activity else None,
            "diet": habit.diet.value if habit.diet else None,
            "sleep_hours": habit.sleep_hours,
            "sleep_problems": habit.sleep_problems,
            "observations": habit.observations,
        } if habit else None,
        "family_history": [
            {
                "id": fh.id,
                "condition_name": fh.condition_name,
                "family_members": fh.family_members,
                "notes": fh.notes,
            }
            for fh in family_history
        ],
    }


# =====================
# Medical Record Endpoints
# =====================

@router.get("/patients/{patient_profile_id}/records")
async def list_patient_records(
    patient_profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
    skip: int = 0,
    limit: int = 50,
    category_id: Optional[int] = Query(None),
):
    """
    List all medical records for a patient the doctor has access to.
    """
    await get_doctor_patient_access(patient_profile_id, db, current_user)
    
    query = select(MedicalRecord).where(
        MedicalRecord.patient_id == patient_profile_id
    ).options(
        selectinload(MedicalRecord.diagnoses),
        selectinload(MedicalRecord.documents),
        selectinload(MedicalRecord.prescriptions),
        selectinload(MedicalRecord.clinical_orders),
        selectinload(MedicalRecord.category)
    ).order_by(MedicalRecord.created_at.desc())
    
    if category_id:
        query = query.where(MedicalRecord.category_id == category_id)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    records = result.scalars().all()
    
    return records


@router.post("/patients/{patient_profile_id}/records")
async def create_patient_record(
    patient_profile_id: uuid.UUID,
    record_in: clinical_schema.DoctorMedicalRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Create a new medical record for a patient.
    Requires write access.
    """
    await get_doctor_patient_access(patient_profile_id, db, current_user, require_write=True)
    
    # Create the medical record
    record = MedicalRecord(
        patient_id=patient_profile_id,
        created_by=current_user.id,
        record_source=RecordSource.DOCTOR,
        status=RecordStatus.VERIFIED,  # Doctor records are auto-verified
        verified_by=current_user.id,
        verified_at=datetime.utcnow(),
        # Core fields
        motive=record_in.motive,
        notes=record_in.notes,
        category_id=record_in.category_id,
        tags=record_in.tags,
        # Doctor-specific fields
        brief_history=record_in.brief_history,
        has_red_flags=record_in.has_red_flags,
        red_flags=record_in.red_flags,
        key_finding=record_in.key_finding,
        clinical_impression=record_in.clinical_impression,
        actions_today=record_in.actions_today,
        plan_bullets=record_in.plan_bullets,
        # Patient-visible fields
        follow_up_interval=record_in.follow_up_interval,
        follow_up_with=record_in.follow_up_with,
        patient_instructions=record_in.patient_instructions,
    )
    db.add(record)
    await db.flush()  # Get record ID
    
    # Add diagnoses
    for diag_in in record_in.diagnoses or []:
        diagnosis = MedicalDiagnosis(
            medical_record_id=record.id,
            created_by=current_user.id,
            diagnosis=diag_in.diagnosis,
            diagnosis_code=diag_in.diagnosis_code,
            diagnosis_code_system=diag_in.diagnosis_code_system,
            rank=diag_in.rank,
            status=diag_in.status,
            notes=diag_in.notes,
        )
        db.add(diagnosis)
    
    # Add prescriptions
    for rx_in in record_in.prescriptions or []:
        prescription = Prescription(
            medical_record_id=record.id,
            created_by=current_user.id,
            medication_name=rx_in.medication_name,
            dosage=rx_in.dosage,
            frequency=rx_in.frequency,
            duration=rx_in.duration,
            route=rx_in.route,
            quantity=rx_in.quantity,
            instructions=rx_in.instructions,
        )
        db.add(prescription)
    
    # Add clinical orders
    for order_in in record_in.orders or []:
        order = ClinicalOrder(
            medical_record_id=record.id,
            created_by=current_user.id,
            order_type=order_in.order_type,
            description=order_in.description,
            urgency=order_in.urgency,
            reason=order_in.reason,
            notes=order_in.notes,
            referral_to=order_in.referral_to,
        )
        db.add(order)
    
    # Add vital signs if provided
    if record_in.vital_signs:
        vital = VitalSigns(
            patient_id=patient_profile_id,
            medical_record_id=record.id,
            created_by=current_user.id,
            **record_in.vital_signs.model_dump(exclude_none=True),
        )
        db.add(vital)
    
    await db.commit()
    await db.refresh(record)
    
    # Reload with relationships
    result = await db.execute(
        select(MedicalRecord)
        .where(MedicalRecord.id == record.id)
        .options(
            selectinload(MedicalRecord.diagnoses),
            selectinload(MedicalRecord.prescriptions),
            selectinload(MedicalRecord.clinical_orders),
            selectinload(MedicalRecord.category),
            selectinload(MedicalRecord.vital_signs),
        )
    )
    return result.scalar_one()


@router.get("/records/{record_id}")
async def get_medical_record(
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Get a single medical record. Validates doctor has access to the patient.
    """
    result = await db.execute(
        select(MedicalRecord)
        .where(MedicalRecord.id == record_id)
        .options(
            selectinload(MedicalRecord.diagnoses),
            selectinload(MedicalRecord.documents),
            selectinload(MedicalRecord.prescriptions),
            selectinload(MedicalRecord.clinical_orders),
            selectinload(MedicalRecord.category)
        )
    )
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Validate access
    await get_doctor_patient_access(record.patient_id, db, current_user)
    
    return record


@router.put("/records/{record_id}/verify")
async def verify_patient_record(
    record_id: uuid.UUID,
    verification: clinical_schema.RecordVerification,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Verify a patient-created record.
    Changes status to VERIFIED and adds doctor as verifier.
    """
    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id)
    )
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Validate write access
    await get_doctor_patient_access(record.patient_id, db, current_user, require_write=True)
    
    # Verify the record
    record.status = RecordStatus.VERIFIED
    record.verified_by = current_user.id
    record.verified_at = datetime.utcnow()
    
    if verification.notes:
        # Append verification notes
        record.notes = (record.notes or "") + f"\n\n[Verified: {verification.notes}]"
    
    await db.commit()
    await db.refresh(record)
    
    return record


# =====================
# Prescription Endpoints
# =====================

@router.post("/records/{record_id}/prescriptions", response_model=clinical_schema.PrescriptionResponse)
async def add_prescription(
    record_id: uuid.UUID,
    rx_in: clinical_schema.PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Add a prescription to a medical record.
    """
    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id)
    )
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    await get_doctor_patient_access(record.patient_id, db, current_user, require_write=True)
    
    prescription = Prescription(
        medical_record_id=record_id,
        created_by=current_user.id,
        medication_name=rx_in.medication_name,
        dosage=rx_in.dosage,
        frequency=rx_in.frequency,
        duration=rx_in.duration,
        route=rx_in.route,
        quantity=rx_in.quantity,
        instructions=rx_in.instructions,
    )
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)
    
    return prescription


@router.delete("/records/{record_id}/prescriptions/{prescription_id}")
async def delete_prescription(
    record_id: uuid.UUID,
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Delete a prescription from a medical record.
    """
    result = await db.execute(
        select(Prescription)
        .where(
            and_(
                Prescription.id == prescription_id,
                Prescription.medical_record_id == record_id
            )
        )
    )
    prescription = result.scalar_one_or_none()
    
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    # Get record to check patient access
    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id)
    )
    record = result.scalar_one()
    await get_doctor_patient_access(record.patient_id, db, current_user, require_write=True)
    
    await db.delete(prescription)
    await db.commit()
    
    return {"message": "Prescription deleted"}


# =====================
# Clinical Order Endpoints
# =====================

@router.post("/records/{record_id}/orders", response_model=clinical_schema.ClinicalOrderResponse)
async def add_clinical_order(
    record_id: uuid.UUID,
    order_in: clinical_schema.ClinicalOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Add a clinical order to a medical record.
    """
    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id)
    )
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    await get_doctor_patient_access(record.patient_id, db, current_user, require_write=True)
    
    order = ClinicalOrder(
        medical_record_id=record_id,
        created_by=current_user.id,
        order_type=order_in.order_type,
        description=order_in.description,
        urgency=order_in.urgency,
        reason=order_in.reason,
        notes=order_in.notes,
        referral_to=order_in.referral_to,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    
    return order


@router.delete("/records/{record_id}/orders/{order_id}")
async def delete_clinical_order(
    record_id: uuid.UUID,
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Delete a clinical order from a medical record.
    """
    result = await db.execute(
        select(ClinicalOrder)
        .where(
            and_(
                ClinicalOrder.id == order_id,
                ClinicalOrder.medical_record_id == record_id
            )
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get record to check patient access
    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id)
    )
    record = result.scalar_one()
    await get_doctor_patient_access(record.patient_id, db, current_user, require_write=True)
    
    await db.delete(order)
    await db.commit()
    
    return {"message": "Order deleted"}


# === VITAL SIGNS ENDPOINTS (Doctor) ===

@router.get("/patients/{patient_profile_id}/vital-signs", response_model=List[hx_schema.VitalSignsResponse])
async def list_patient_vital_signs(
    patient_profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """List all vital signs for a patient (descending)."""
    await get_doctor_patient_access(patient_profile_id, db, current_user)
    
    stmt = (
        select(VitalSigns)
        .filter(VitalSigns.patient_id == patient_profile_id)
        .order_by(VitalSigns.measured_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/patients/{patient_profile_id}/records/{record_id}/vital-signs", response_model=hx_schema.VitalSignsResponse)
async def create_record_vital_signs(
    patient_profile_id: uuid.UUID,
    record_id: uuid.UUID,
    vital_in: hx_schema.VitalSignsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Create vital signs linked to a medical record."""
    await get_doctor_patient_access(patient_profile_id, db, current_user, require_write=True)
    
    # Verify record exists and belongs to patient
    result = await db.execute(
        select(MedicalRecord).where(
            and_(MedicalRecord.id == record_id, MedicalRecord.patient_id == patient_profile_id)
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    
    vital = VitalSigns(
        patient_id=patient_profile_id,
        medical_record_id=record_id,
        created_by=current_user.id,
        **vital_in.model_dump(exclude_none=True),
    )
    db.add(vital)
    await db.commit()
    await db.refresh(vital)
    return vital


# === RECORD UPDATE ENDPOINT ===

@router.put("/records/{record_id}")
async def update_medical_record(
    record_id: uuid.UUID,
    record_in: clinical_schema.DoctorMedicalRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """
    Update a medical record.
    Allowed if: doctor created it, OR it's a patient-created record not yet verified by another doctor.
    """
    result = await db.execute(
        select(MedicalRecord)
        .where(MedicalRecord.id == record_id)
        .options(
            selectinload(MedicalRecord.diagnoses),
            selectinload(MedicalRecord.prescriptions),
            selectinload(MedicalRecord.clinical_orders),
            selectinload(MedicalRecord.vital_signs),
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    
    # Check access to patient
    await get_doctor_patient_access(record.patient_id, db, current_user, require_write=True)
    
    # Permission check: can this doctor edit this record?
    can_edit = False
    if record.created_by == current_user.id:
        can_edit = True
    elif record.record_source == RecordSource.PATIENT and (
        record.verified_by is None or record.verified_by == current_user.id
    ):
        can_edit = True
    
    if not can_edit:
        raise HTTPException(status_code=403, detail="No permission to edit this record")
    
    # Update scalar fields
    update_fields = record_in.model_dump(
        exclude_none=True,
        exclude={'diagnoses', 'prescriptions', 'orders', 'vital_signs'},
    )
    for field, value in update_fields.items():
        setattr(record, field, value)
    
    # Replace diagnoses if provided
    if record_in.diagnoses is not None:
        # Delete existing diagnoses
        for diag in list(record.diagnoses):
            await db.delete(diag)
        # Add new ones
        for diag_in in record_in.diagnoses:
            diagnosis = MedicalDiagnosis(
                medical_record_id=record.id,
                created_by=current_user.id,
                diagnosis=diag_in.diagnosis,
                diagnosis_code=diag_in.diagnosis_code,
                diagnosis_code_system=diag_in.diagnosis_code_system,
                rank=diag_in.rank,
                status=diag_in.status,
                notes=diag_in.notes,
            )
            db.add(diagnosis)
    
    # Replace prescriptions if provided
    if record_in.prescriptions is not None:
        for rx in list(record.prescriptions):
            await db.delete(rx)
        for rx_in in record_in.prescriptions:
            prescription = Prescription(
                medical_record_id=record.id,
                created_by=current_user.id,
                medication_name=rx_in.medication_name,
                dosage=rx_in.dosage,
                frequency=rx_in.frequency,
                duration=rx_in.duration,
                route=rx_in.route,
                quantity=rx_in.quantity,
                instructions=rx_in.instructions,
            )
            db.add(prescription)
    
    # Replace orders if provided
    if record_in.orders is not None:
        for order in list(record.clinical_orders):
            await db.delete(order)
        for order_in in record_in.orders:
            clinical_order = ClinicalOrder(
                medical_record_id=record.id,
                created_by=current_user.id,
                order_type=order_in.order_type,
                description=order_in.description,
                urgency=order_in.urgency,
                reason=order_in.reason,
                notes=order_in.notes,
                referral_to=order_in.referral_to,
            )
            db.add(clinical_order)
    
    # Replace vital signs if provided
    if record_in.vital_signs is not None:
        if record.vital_signs:
            await db.delete(record.vital_signs)
        vital = VitalSigns(
            patient_id=record.patient_id,
            medical_record_id=record.id,
            created_by=current_user.id,
            **record_in.vital_signs.model_dump(exclude_none=True),
        )
        db.add(vital)
    
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(MedicalRecord)
        .where(MedicalRecord.id == record.id)
        .options(
            selectinload(MedicalRecord.diagnoses),
            selectinload(MedicalRecord.prescriptions),
            selectinload(MedicalRecord.clinical_orders),
            selectinload(MedicalRecord.category),
            selectinload(MedicalRecord.vital_signs),
        )
    )
    return result.scalar_one()


# ============================================
# Doctor Health History CRUD for Patients
# ============================================

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
    from app.models.patient import Condition as ConditionModel
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
    from app.models.patient import Condition as ConditionModel
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
    from app.models.patient import Condition as ConditionModel
    from datetime import datetime as dt
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
    condition.deleted_at = dt.utcnow()
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
    from app.models.patient import Allergy as AllergyModel
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
    from app.models.patient import Allergy as AllergyModel
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
    from app.models.patient import Allergy as AllergyModel
    from datetime import datetime as dt
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
    allergy.deleted_at = dt.utcnow()
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
    from app.models.patient import Medication as MedicationModel
    med = MedicationModel(patient_profile_id=patient_id, **med_in.model_dump())
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
    from app.models.patient import Medication as MedicationModel
    result = await db.execute(
        select(MedicationModel).filter(
            MedicationModel.id == med_id,
            MedicationModel.patient_profile_id == patient_id,
            MedicationModel.deleted == False,
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
    """Doctor soft-deletes a medication from patient's profile."""
    await get_doctor_patient_access(patient_id, db, current_user, require_write=True)
    from app.models.patient import Medication as MedicationModel
    from datetime import datetime as dt
    result = await db.execute(
        select(MedicationModel).filter(
            MedicationModel.id == med_id,
            MedicationModel.patient_profile_id == patient_id,
            MedicationModel.deleted == False,
        )
    )
    med = result.scalars().first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    med.deleted = True
    med.deleted_at = dt.utcnow()
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
    from app.models.patient import HealthHabit
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
    from app.models.patient import HealthHabit
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
    from app.models.patient import FamilyHistoryCondition
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
    from app.models.patient import FamilyHistoryCondition
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
    from app.models.patient import FamilyHistoryCondition
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
    from app.models.patient import FamilyHistoryCondition
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
