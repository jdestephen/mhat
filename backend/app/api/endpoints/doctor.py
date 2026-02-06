"""
Doctor API Endpoints

Endpoints for doctor workflow: patient access, medical records, prescriptions, orders.
"""
import uuid
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, or_

from app.api import deps
from app.api.deps import get_db
from app.models.user import User, UserRole, DoctorPatientAccess, AccessLevel
from app.models.patient import PatientProfile
from app.models.hx import MedicalRecord, RecordSource, RecordStatus, MedicalDiagnosis
from app.models.clinical import Prescription, ClinicalOrder
from app.schemas import clinical as clinical_schema

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
    
    if require_write and access.access_level != AccessLevel.WRITE:
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
    access_level: AccessLevel = AccessLevel.WRITE,
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
            selectinload(MedicalRecord.category)
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
