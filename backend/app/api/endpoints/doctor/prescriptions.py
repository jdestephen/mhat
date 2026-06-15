"""Prescription management on medical records."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.api.deps import get_db
from app.models.user import User
from app.models.hx import MedicalRecord
from app.models.clinical import Prescription
from app.schemas import clinical as clinical_schema

from ._helpers import require_doctor_role, get_doctor_patient_access

router = APIRouter()


@router.post("/records/{record_id}/prescriptions", response_model=clinical_schema.PrescriptionResponse)
async def add_prescription(
    record_id: uuid.UUID,
    rx_in: clinical_schema.PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Add a prescription to a medical record."""
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
    """Delete a prescription from a medical record."""
    result = await db.execute(
        select(Prescription).where(
            and_(
                Prescription.id == prescription_id,
                Prescription.medical_record_id == record_id,
            )
        )
    )
    prescription = result.scalar_one_or_none()

    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id)
    )
    record = result.scalar_one()
    await get_doctor_patient_access(record.patient_id, db, current_user, require_write=True)

    await db.delete(prescription)
    await db.commit()

    return {"message": "Prescription deleted"}
