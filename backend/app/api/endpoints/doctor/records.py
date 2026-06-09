"""Medical record CRUD for doctor workflow."""
import uuid
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_

from app.api.deps import get_db
from app.models.user import User, UserRole
from app.models.hx import (
    MedicalRecord, RecordSource, RecordStatus,
    MedicalDiagnosis, VitalSigns, RecordViewLog, VitalSignsStatus,
)
from app.models.clinical import Prescription, ClinicalOrder
from app.schemas import clinical as clinical_schema
from app.schemas import hx as hx_schema

from ._helpers import require_doctor_role, get_doctor_patient_access

router = APIRouter()


@router.get("/patients/{patient_profile_id}/records", response_model=List[hx_schema.MedicalRecord])
async def list_patient_records(
    patient_profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
    skip: int = 0,
    limit: int = 50,
    category_id: Optional[int] = Query(None),
):
    """List all medical records for a patient the doctor has access to."""
    await get_doctor_patient_access(patient_profile_id, db, current_user)

    query = select(MedicalRecord).where(
        MedicalRecord.patient_id == patient_profile_id
    ).options(
        selectinload(MedicalRecord.diagnoses),
        selectinload(MedicalRecord.documents),
        selectinload(MedicalRecord.prescriptions),
        selectinload(MedicalRecord.clinical_orders),
        selectinload(MedicalRecord.category),
        selectinload(MedicalRecord.vital_signs),
    ).order_by(MedicalRecord.record_date.desc())

    if category_id:
        query = query.where(MedicalRecord.category_id == category_id)

    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    records = result.scalars().all()

    return records


@router.post("/patients/{patient_profile_id}/records", response_model=hx_schema.MedicalRecord)
async def create_patient_record(
    patient_profile_id: uuid.UUID,
    record_in: clinical_schema.DoctorMedicalRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Create a new medical record for a patient. Requires write access."""
    await get_doctor_patient_access(patient_profile_id, db, current_user, require_write=True)

    record = MedicalRecord(
        patient_id=patient_profile_id,
        created_by=current_user.id,
        record_source=RecordSource.DOCTOR,
        status=RecordStatus.VERIFIED,
        verified_by=current_user.id,
        verified_at=datetime.utcnow(),
        motive=record_in.motive,
        record_date=record_in.record_date or date.today(),
        notes=record_in.notes,
        category_id=record_in.category_id,
        tags=record_in.tags,
        brief_history=record_in.brief_history,
        has_red_flags=record_in.has_red_flags,
        red_flags=record_in.red_flags,
        key_finding=record_in.key_finding,
        clinical_impression=record_in.clinical_impression,
        actions_today=record_in.actions_today,
        plan_bullets=record_in.plan_bullets,
        follow_up_interval=record_in.follow_up_interval,
        follow_up_with=record_in.follow_up_with,
        patient_instructions=record_in.patient_instructions,
    )
    db.add(record)
    await db.flush()

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

    if record_in.vital_signs:
        if record_in.existing_vital_signs_id:
            result = await db.execute(
                select(VitalSigns).where(
                    VitalSigns.id == record_in.existing_vital_signs_id,
                    VitalSigns.patient_id == patient_profile_id,
                )
            )
            existing_vital = result.scalar_one_or_none()
            if existing_vital:
                update_data = record_in.vital_signs.model_dump(exclude_none=True)
                for key, value in update_data.items():
                    setattr(existing_vital, key, value)
                existing_vital.medical_record_id = record.id
                existing_vital.status = VitalSignsStatus.VERIFIED
                existing_vital.measured_at = datetime.combine(record.record_date, datetime.min.time())
                existing_vital.updated_by = current_user.id
                existing_vital.updated_at = datetime.now(timezone.utc)
            else:
                vital = VitalSigns(
                    patient_id=patient_profile_id,
                    medical_record_id=record.id,
                    created_by=current_user.id,
                    status=VitalSignsStatus.VERIFIED,
                    measured_at=datetime.combine(record.record_date, datetime.min.time()),
                    **record_in.vital_signs.model_dump(exclude_none=True, exclude={'measured_at'}),
                )
                db.add(vital)
        else:
            vital = VitalSigns(
                patient_id=patient_profile_id,
                medical_record_id=record.id,
                created_by=current_user.id,
                status=VitalSignsStatus.VERIFIED,
                measured_at=datetime.combine(record.record_date, datetime.min.time()),
                **record_in.vital_signs.model_dump(exclude_none=True, exclude={'measured_at'}),
            )
            db.add(vital)

    await db.commit()
    await db.refresh(record)

    result = await db.execute(
        select(MedicalRecord)
        .where(MedicalRecord.id == record.id)
        .options(
            selectinload(MedicalRecord.diagnoses),
            selectinload(MedicalRecord.documents),
            selectinload(MedicalRecord.prescriptions),
            selectinload(MedicalRecord.clinical_orders),
            selectinload(MedicalRecord.category),
            selectinload(MedicalRecord.vital_signs),
        )
    )
    return result.scalar_one()


@router.get("/records/{record_id}", response_model=hx_schema.MedicalRecord)
async def get_medical_record(
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Get a single medical record. Validates doctor has access to the patient."""
    result = await db.execute(
        select(MedicalRecord)
        .where(MedicalRecord.id == record_id)
        .options(
            selectinload(MedicalRecord.diagnoses),
            selectinload(MedicalRecord.documents),
            selectinload(MedicalRecord.prescriptions),
            selectinload(MedicalRecord.clinical_orders),
            selectinload(MedicalRecord.category),
            selectinload(MedicalRecord.vital_signs),
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    await get_doctor_patient_access(record.patient_id, db, current_user)

    fifteen_min_ago = datetime.now(timezone.utc) - timedelta(minutes=15)
    existing_log = await db.execute(
        select(RecordViewLog).where(
            RecordViewLog.medical_record_id == record_id,
            RecordViewLog.doctor_id == current_user.id,
            RecordViewLog.viewed_at > fifteen_min_ago,
        )
    )
    if not existing_log.scalar_one_or_none():
        log_entry = RecordViewLog(
            medical_record_id=record_id,
            doctor_id=current_user.id,
        )
        db.add(log_entry)
        await db.commit()

    return record


@router.put("/records/{record_id}/verify")
async def verify_patient_record(
    record_id: uuid.UUID,
    verification: clinical_schema.RecordVerification,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Verify a patient-created record."""
    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id)
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    await get_doctor_patient_access(record.patient_id, db, current_user, require_write=True)

    record.status = RecordStatus.VERIFIED
    record.verified_by = current_user.id
    record.verified_at = datetime.utcnow()

    if verification.notes:
        record.notes = (record.notes or "") + f"\n\n[Verified: {verification.notes}]"

    await db.commit()
    await db.refresh(record)

    return record


@router.put("/records/{record_id}", response_model=hx_schema.MedicalRecord)
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

    await get_doctor_patient_access(record.patient_id, db, current_user, require_write=True)

    can_edit = False
    if record.created_by == current_user.id:
        can_edit = True
    elif record.record_source == RecordSource.PATIENT and (
        record.verified_by is None or record.verified_by == current_user.id
    ):
        can_edit = True

    if not can_edit:
        raise HTTPException(status_code=403, detail="No permission to edit this record")

    if record.record_source == RecordSource.PATIENT and record.created_by != current_user.id:
        record.status = RecordStatus.VERIFIED
        record.verified_by = current_user.id
        record.verified_at = datetime.now(timezone.utc)

    update_fields = record_in.model_dump(
        exclude_none=True,
        exclude={'diagnoses', 'prescriptions', 'orders', 'vital_signs'},
    )
    for field, value in update_fields.items():
        setattr(record, field, value)

    if record_in.diagnoses is not None:
        for diag in list(record.diagnoses):
            await db.delete(diag)
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

    if record_in.vital_signs is not None:
        if record.vital_signs:
            await db.delete(record.vital_signs)
        vital = VitalSigns(
            patient_id=record.patient_id,
            medical_record_id=record.id,
            created_by=current_user.id,
            status=VitalSignsStatus.VERIFIED,
            measured_at=datetime.combine(record.record_date, datetime.min.time()),
            **record_in.vital_signs.model_dump(exclude_none=True, exclude={'measured_at'}),
        )
        db.add(vital)

    await db.commit()

    result = await db.execute(
        select(MedicalRecord)
        .where(MedicalRecord.id == record.id)
        .options(
            selectinload(MedicalRecord.diagnoses),
            selectinload(MedicalRecord.documents),
            selectinload(MedicalRecord.prescriptions),
            selectinload(MedicalRecord.clinical_orders),
            selectinload(MedicalRecord.category),
            selectinload(MedicalRecord.vital_signs),
        )
    )
    return result.scalar_one()
