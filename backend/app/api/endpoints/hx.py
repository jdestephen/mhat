import os
import shutil
import uuid
from typing import List, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core.config import settings
from app.db.session import get_db
from app.models.hx import MedicalRecord, Document, RecordStatus, RecordSource, MedicalDiagnosis, DiagnosisStatus, VitalSigns
from app.models.user import User, UserRole
from app.models.patient import PatientProfile
from app.schemas import hx as hx_schema
from app.services import ocr
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=hx_schema.MedicalRecord)
async def create_medical_record(
    *,
    db: AsyncSession = Depends(get_db),
    record_in: hx_schema.MedicalRecordCreate,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Create a new Medical Record. 
    If user is Patient, creates for self.
    If user is Doctor, must specify patient_id (TODO: Permission check).
    For now, assuming Patient creates their own records.
    """
    print(f"DEBUG: Received request to create medical record")
    print(f"DEBUG: record_in = {record_in}")
    print(f"DEBUG: record_in.diagnoses = {record_in.diagnoses}")
    
    # Resolve Patient Profile
    # Simplified logic: Assumes current user is the patient
    # TODO: Add logic for Doctor creating record for a specific patient
    
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    patient_profile = result.scalars().first()
    
    if not patient_profile:
        raise HTTPException(status_code=400, detail="Patient profile not found for this user")

    # Build search_text field by concatenating searchable content
    search_parts = []
    
    if record_in.motive:
        search_parts.append(record_in.motive.lower())
    
    if record_in.diagnoses:
        for diag in record_in.diagnoses:
            search_parts.append(diag.diagnosis.lower())
    
    if record_in.tags:
        search_parts.extend([tag.lower() for tag in record_in.tags])
    
    if record_in.notes:
        search_parts.append(record_in.notes.lower())
    
    status = RecordStatus.UNVERIFIED
    if current_user.role == UserRole.DOCTOR:
        status = RecordStatus.VERIFIED
    search_parts.append(status.value.lower())
    
    if record_in.category_id:
        from app.models.hx import Category
        category_result = await db.execute(select(Category).filter(Category.id == record_in.category_id))
        category = category_result.scalars().first()
        if category:
            search_parts.append(category.name.lower())
    
    search_text = " ".join(search_parts)

    medical_record = MedicalRecord(
        patient_id=patient_profile.id,
        motive=record_in.motive,
        notes=record_in.notes,
        category_id=record_in.category_id,
        tags=record_in.tags,
        created_by=current_user.id,
        status=status,
        search_text=search_text
    )
    
    if current_user.role == UserRole.DOCTOR:
        medical_record.verified_by = current_user.id
        medical_record.verified_at = datetime.utcnow()
    
    db.add(medical_record)
    await db.flush()
    
    
    if record_in.diagnoses:
        for idx, diag_in in enumerate(record_in.diagnoses):
            # Apply smart defaults for patients, use provided values for doctors
            if current_user.role == UserRole.PATIENT:
                # Patients: auto-assign rank sequentially, force PROVISIONAL status
                rank = idx + 1  # Sequential: 1, 2, 3...
                status = DiagnosisStatus.PROVISIONAL
            else:
                # Doctors: use provided values
                rank = diag_in.rank
                status = diag_in.status
            
            diagnosis = MedicalDiagnosis(
                medical_record_id=medical_record.id,
                diagnosis=diag_in.diagnosis,
                diagnosis_code=diag_in.diagnosis_code,
                diagnosis_code_system=diag_in.diagnosis_code_system,
                rank=rank,
                status=status,
                notes=diag_in.notes,
                created_by=current_user.id
            )
            db.add(diagnosis)
    
    await db.commit()
    result = await db.execute(
        select(MedicalRecord)
        .filter(MedicalRecord.id == medical_record.id)
        .options(
            selectinload(MedicalRecord.documents), 
            selectinload(MedicalRecord.category),
            selectinload(MedicalRecord.diagnoses),
            selectinload(MedicalRecord.prescriptions),
            selectinload(MedicalRecord.clinical_orders),
            selectinload(MedicalRecord.vital_signs)
        )
    )
    return result.scalars().first()

@router.get("/categories", response_model=List[hx_schema.Category])
async def read_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve all categories.
    """
    from app.models.hx import Category
    result = await db.execute(select(Category).order_by(Category.order))
    return result.scalars().all()

@router.post("/{record_id}/documents", response_model=hx_schema.Document)
async def upload_document_to_record(
    *,
    record_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Upload a document and attach it to a Medical Record.
    """
    # Verify Record Exists and Access
    result = await db.execute(select(MedicalRecord).filter(MedicalRecord.id == record_id))
    record = result.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Medical Record not found")
    
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Save file
    file_extension = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)
    s3_key = file_name # using local path as key for prototype
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create DB Entry
    doc = Document(
        medical_record_id=record.id,
        s3_key=s3_key,
        filename=file.filename,
        media_type=file_extension,
        url=f"/static/uploads/{file_name}" # Placeholder URL
    )
    
    # Optional: Basic OCR Trigger
    if file_extension.lower() in ["jpg", "jpeg", "png"]:
        try:
            extracted_text = ocr.process_image(file_path)
            doc.ocr_text = extracted_text
        except Exception as e:
            print(f"OCR Failed: {e}")
        
    db.add(doc)
    
    # Update record status if it's currently unverified
    if record.status == RecordStatus.UNVERIFIED:
        record.status = RecordStatus.BACKED_BY_DOCUMENT

    await db.commit()
    await db.refresh(doc)
    return doc

@router.get("/", response_model=List[hx_schema.MedicalRecord])
async def read_medical_records(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
    # Search parameters
    q: Optional[str] = Query(None, description="Text search query"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
) -> Any:
    """
    Retrieve Medical Records for the current user (Patient) with optional search filters.
    """
    # Resolve Patient Profile
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    patient_profile = result.scalars().first()
    
    if not patient_profile:
        return []

    # Build query with base filter
    stmt = select(MedicalRecord).filter(MedicalRecord.patient_id == patient_profile.id)
    
    # Text search filter (includes motive, diagnosis, notes, tags, category, status)
    if q:
        stmt = stmt.filter(MedicalRecord.search_text.contains(q.lower()))
    
    # Date range filters
    if date_from:
        try:
            from_date = datetime.fromisoformat(date_from)
            stmt = stmt.filter(MedicalRecord.created_at >= from_date)
        except ValueError:
            pass  # Ignore invalid date format
    
    if date_to:
        try:
            # Add one day to include entire end date
            to_date = datetime.fromisoformat(date_to) + timedelta(days=1)
            stmt = stmt.filter(MedicalRecord.created_at < to_date)
        except ValueError:
            pass  # Ignore invalid date format
    
    # Apply eager loading, pagination, and ordering
    stmt = stmt.options(
        selectinload(MedicalRecord.documents),
        selectinload(MedicalRecord.category),
        selectinload(MedicalRecord.diagnoses),
        selectinload(MedicalRecord.prescriptions),
        selectinload(MedicalRecord.clinical_orders),
        selectinload(MedicalRecord.vital_signs)
    ).offset(skip).limit(limit).order_by(MedicalRecord.created_at.desc())
    
    result = await db.execute(stmt)
    return result.scalars().all()


# === VITAL SIGNS ENDPOINTS (Patient) ===
# These must be registered BEFORE /{record_id} to avoid route collision.

@router.post("/vital-signs", response_model=hx_schema.VitalSignsResponse)
async def create_vital_signs(
    *,
    db: AsyncSession = Depends(get_db),
    vital_in: hx_schema.VitalSignsCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create a standalone vital signs record for the current patient."""
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    patient_profile = result.scalars().first()
    if not patient_profile:
        raise HTTPException(status_code=400, detail="Patient profile not found")

    vital_signs = VitalSigns(
        patient_id=patient_profile.id,
        created_by=current_user.id,
        **vital_in.model_dump(exclude_none=True),
    )
    db.add(vital_signs)
    await db.commit()
    await db.refresh(vital_signs)
    return vital_signs


@router.get("/vital-signs", response_model=List[hx_schema.VitalSignsResponse])
async def list_vital_signs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """List all vital signs for the current patient (descending by measured_at)."""
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    patient_profile = result.scalars().first()
    if not patient_profile:
        raise HTTPException(status_code=400, detail="Patient profile not found")

    stmt = (
        select(VitalSigns)
        .filter(VitalSigns.patient_id == patient_profile.id)
        .order_by(VitalSigns.measured_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/vital-signs/{vital_id}", response_model=hx_schema.VitalSignsResponse)
async def get_vital_signs(
    vital_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get a single vital signs record."""
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    patient_profile = result.scalars().first()
    if not patient_profile:
        raise HTTPException(status_code=400, detail="Patient profile not found")

    stmt = select(VitalSigns).filter(
        VitalSigns.id == vital_id,
        VitalSigns.patient_id == patient_profile.id,
    )
    result = await db.execute(stmt)
    vital = result.scalars().first()
    if not vital:
        raise HTTPException(status_code=404, detail="Vital signs record not found")
    return vital


@router.get("/{record_id}", response_model=hx_schema.MedicalRecord)
async def get_medical_record(
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get a single medical record by ID.
    """
    # Resolve Patient Profile
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    patient_profile = result.scalars().first()
    
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Get record with eager loading
    stmt = select(MedicalRecord).filter(
        MedicalRecord.id == record_id,
        MedicalRecord.patient_id == patient_profile.id
    ).options(
        selectinload(MedicalRecord.documents),
        selectinload(MedicalRecord.category),
        selectinload(MedicalRecord.diagnoses),
        selectinload(MedicalRecord.prescriptions),
        selectinload(MedicalRecord.clinical_orders),
        selectinload(MedicalRecord.vital_signs)
    )
    
    result = await db.execute(stmt)
    record = result.scalars().first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    
    return record


@router.put("/{record_id}", response_model=hx_schema.MedicalRecord)
async def update_medical_record(
    record_id: uuid.UUID,
    record_in: hx_schema.MedicalRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Patient updates their own medical record.
    Allowed only if:
      - The patient owns this record
      - The record was created by the patient (record_source == PATIENT)
      - No doctor has verified/edited it yet (verified_by is None)
    """
    # Resolve Patient Profile
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    patient_profile = result.scalars().first()
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Load the record with relationships
    result = await db.execute(
        select(MedicalRecord)
        .filter(
            MedicalRecord.id == record_id,
            MedicalRecord.patient_id == patient_profile.id,
        )
        .options(
            selectinload(MedicalRecord.diagnoses),
            selectinload(MedicalRecord.documents),
            selectinload(MedicalRecord.category),
            selectinload(MedicalRecord.prescriptions),
            selectinload(MedicalRecord.clinical_orders),
            selectinload(MedicalRecord.vital_signs),
        )
    )
    record = result.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")

    # Permission check
    if record.record_source != RecordSource.PATIENT or record.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes editar registros creados por ti")
    if record.verified_by is not None:
        raise HTTPException(status_code=403, detail="Este registro ya fue verificado por un médico y no puede ser editado")

    # Update scalar fields
    update_data = record_in.model_dump(exclude_none=True, exclude={"diagnoses"})
    for field, value in update_data.items():
        setattr(record, field, value)

    # Replace diagnoses if provided
    if record_in.diagnoses is not None:
        for diag in list(record.diagnoses):
            await db.delete(diag)
        for idx, diag_in in enumerate(record_in.diagnoses):
            diagnosis = MedicalDiagnosis(
                medical_record_id=record.id,
                created_by=current_user.id,
                diagnosis=diag_in.diagnosis,
                diagnosis_code=diag_in.diagnosis_code,
                diagnosis_code_system=diag_in.diagnosis_code_system,
                rank=idx + 1,
                status=DiagnosisStatus.PROVISIONAL,
                notes=diag_in.notes,
            )
            db.add(diagnosis)

    # Rebuild search_text
    search_parts = []
    if record.motive:
        search_parts.append(record.motive.lower())
    if record_in.diagnoses:
        for d in record_in.diagnoses:
            search_parts.append(d.diagnosis.lower())
    if record.tags:
        search_parts.extend([t.lower() for t in record.tags])
    if record.notes:
        search_parts.append(record.notes.lower())
    search_parts.append(record.status.value.lower())
    record.search_text = " ".join(search_parts)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(MedicalRecord)
        .filter(MedicalRecord.id == record.id)
        .options(
            selectinload(MedicalRecord.documents),
            selectinload(MedicalRecord.category),
            selectinload(MedicalRecord.diagnoses),
            selectinload(MedicalRecord.prescriptions),
            selectinload(MedicalRecord.clinical_orders),
            selectinload(MedicalRecord.vital_signs),
        )
    )
    return result.scalar_one()
