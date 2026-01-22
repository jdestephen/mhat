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
from app.models.hx import MedicalRecord, Document, RecordStatus
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
    # Resolve Patient Profile
    # Simplified logic: Assumes current user is the patient
    # TODO: Add logic for Doctor creating record for a specific patient
    
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    patient_profile = result.scalars().first()
    
    if not patient_profile:
        raise HTTPException(status_code=400, detail="Patient profile not found for this user")

    medical_record = MedicalRecord(
        patient_id=patient_profile.id,
        motive=record_in.motive,
        diagnosis=record_in.diagnosis,
        diagnosis_code=record_in.diagnosis_code,
        diagnosis_code_system=record_in.diagnosis_code_system,
        notes=record_in.notes,
        category_id=record_in.category_id,
        tags=record_in.tags,
        created_by=current_user.id,
        status=RecordStatus.UNVERIFIED
    )
    
    # Auto-verify if doctor creates the record
    if current_user.role == UserRole.DOCTOR:
        medical_record.status = RecordStatus.VERIFIED
        medical_record.verified_by = current_user.id
        medical_record.verified_at = datetime.utcnow()
    
    db.add(medical_record)
    await db.commit()
    # Re-fetch with eager loading to strictly satisfy Pydantic and Async restrictions
    result = await db.execute(
        select(MedicalRecord)
        .filter(MedicalRecord.id == medical_record.id)
        .options(selectinload(MedicalRecord.documents), selectinload(MedicalRecord.category))
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
    result = await db.execute(select(Category).order_by(Category.name))
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
        selectinload(MedicalRecord.category)
    ).offset(skip).limit(limit).order_by(MedicalRecord.created_at.desc())
    
    result = await db.execute(stmt)
    return result.scalars().all()

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
        selectinload(MedicalRecord.category)
    )
    
    result = await db.execute(stmt)
    record = result.scalars().first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    
    return record
