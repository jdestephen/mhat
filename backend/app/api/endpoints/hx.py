import os
import shutil
import uuid
from typing import List, Any
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core.config import settings
from app.db.session import get_db
from app.models.hx import MedicalRecord, Document
from app.models.user import User
from app.models.patient import PatientProfile
from app.schemas import hx as hx_schema
from app.services import ocr

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
        notes=record_in.notes,
        category_id=record_in.category_id,
        tags=record_in.tags
    )
    db.add(medical_record)
    await db.commit()
    # Re-fetch with eager loading to strictly satisfy Pydantic and Async restrictions
    result = await db.execute(
        select(MedicalRecord)
        .filter(MedicalRecord.id == medical_record.id)
        .options(selectinload(MedicalRecord.documents))
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
    record_id: int,
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
    await db.commit()
    await db.refresh(doc)
    return doc

@router.get("/", response_model=List[hx_schema.MedicalRecord])
async def read_medical_records(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve Medical Records for the current user (Patient).
    """
    # Resolve Patient Profile
    result = await db.execute(select(PatientProfile).filter(PatientProfile.user_id == current_user.id))
    patient_profile = result.scalars().first()
    
    if not patient_profile:
        return []

    result = await db.execute(
        select(MedicalRecord)
        .filter(MedicalRecord.patient_id == patient_profile.id)
        .options(selectinload(MedicalRecord.documents))
        .offset(skip)
        .limit(limit)
        .order_by(MedicalRecord.created_at.desc())
    )
    return result.scalars().all()
