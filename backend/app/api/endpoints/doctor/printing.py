"""Doctor letterhead settings and authenticated PDF printing."""
from datetime import datetime
from io import BytesIO
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_db
from app.models.clinical import ClinicalOrder, Prescription
from app.models.doctor import DoctorProfile
from app.models.hx import MedicalRecord
from app.models.patient import PatientProfile
from app.models.print_settings import DoctorPrintSettings
from app.models.user import User
from app.schemas.print_settings import PrintSettingsResponse, PrintSettingsUpdate
from app.services import storage
from app.services.clinical_printing import render_order_pdf, render_prescription_pdf

from ._helpers import get_doctor_patient_access, require_doctor_role


router = APIRouter()
MAX_LOGO_BYTES = 1 * 1024 * 1024
MAX_LOGO_PIXELS = 4_000_000
LOGO_FORMATS = {"PNG": ("image/png", "png"), "JPEG": ("image/jpeg", "jpg")}


async def _get_settings(db: AsyncSession, doctor_id: UUID) -> DoctorPrintSettings | None:
    return await db.get(DoctorPrintSettings, doctor_id)


async def _get_default_degree(db: AsyncSession, doctor_id: UUID) -> str | None:
    profile = await db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == doctor_id))
    return profile.degree if profile else None


def _doctor_name(user: User) -> str:
    return " ".join(part for part in [user.first_name, user.last_name] if part)


def _settings_response(user: User, degree: str | None,
                       settings: DoctorPrintSettings | None) -> dict:
    fields = (
        "name_override", "degree_override", "clinic_name", "phone_1", "phone_2",
        "address", "public_email", "show_duration", "paper_size",
    )
    data = {field: getattr(settings, field) for field in fields} if settings else {
        "name_override": None, "degree_override": None, "clinic_name": None,
        "phone_1": None, "phone_2": None, "address": None, "public_email": None,
        "show_duration": True, "paper_size": "A4",
    }
    return {
        **data,
        "default_name": _doctor_name(user),
        "default_degree": degree,
        "logo_present": bool(settings and settings.logo_key),
    }


@router.get("/print-settings", response_model=PrintSettingsResponse)
async def get_print_settings(
    db: AsyncSession = Depends(get_db),
    doctor: User = Depends(require_doctor_role),
):
    settings = await _get_settings(db, doctor.id)
    degree = await _get_default_degree(db, doctor.id)
    return _settings_response(doctor, degree, settings)


@router.put("/print-settings", response_model=PrintSettingsResponse)
async def update_print_settings(
    update: PrintSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    doctor: User = Depends(require_doctor_role),
):
    settings = await _get_settings(db, doctor.id)
    if not settings:
        settings = DoctorPrintSettings(doctor_id=doctor.id)
        db.add(settings)
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    await db.commit()
    await db.refresh(settings)
    degree = await _get_default_degree(db, doctor.id)
    return _settings_response(doctor, degree, settings)


@router.post("/print-settings/logo", response_model=PrintSettingsResponse)
async def upload_print_logo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    doctor: User = Depends(require_doctor_role),
):
    content = await file.read(MAX_LOGO_BYTES + 1)
    if len(content) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=413, detail="El logo no debe superar 1 MB")
    try:
        with Image.open(BytesIO(content)) as image:
            image_format = image.format
            dimensions = image.size
            if dimensions[0] * dimensions[1] > MAX_LOGO_PIXELS:
                raise HTTPException(status_code=422, detail="El logo no debe superar 4 megapíxeles")
            image.verify()
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Imagen no válida") from exc
    if image_format not in LOGO_FORMATS:
        raise HTTPException(status_code=422, detail="Usa PNG o JPEG")
    expected_mime, extension = LOGO_FORMATS[image_format]
    if file.content_type != expected_mime:
        raise HTTPException(status_code=422, detail="El tipo de imagen no coincide con el archivo")

    await file.seek(0)
    file.filename = f"logo.{extension}"
    uploaded = await storage.upload_file(file, folder=f"logos/doctors/{doctor.id}")
    settings = await _get_settings(db, doctor.id)
    if not settings:
        settings = DoctorPrintSettings(doctor_id=doctor.id)
        db.add(settings)
    old_key = settings.logo_key
    settings.logo_key = uploaded.s3_key
    settings.logo_content_type = expected_mime
    try:
        await db.commit()
    except Exception:
        await storage.delete_file(uploaded.s3_key)
        raise
    if old_key:
        await storage.delete_file(old_key)
    await db.refresh(settings)
    degree = await _get_default_degree(db, doctor.id)
    return _settings_response(doctor, degree, settings)


@router.get("/print-settings/logo")
async def get_print_logo(
    db: AsyncSession = Depends(get_db),
    doctor: User = Depends(require_doctor_role),
):
    settings = await _get_settings(db, doctor.id)
    if not settings or not settings.logo_key:
        raise HTTPException(status_code=404, detail="Logo no encontrado")
    content = await run_in_threadpool(storage.read_file_bytes, settings.logo_key)
    return Response(content=content, media_type=settings.logo_content_type or "image/png",
                    headers={"Cache-Control": "private, no-store"})


@router.delete("/print-settings/logo", status_code=204)
async def delete_print_logo(
    db: AsyncSession = Depends(get_db),
    doctor: User = Depends(require_doctor_role),
):
    settings = await _get_settings(db, doctor.id)
    if settings and settings.logo_key:
        old_key = settings.logo_key
        settings.logo_key = None
        settings.logo_content_type = None
        await db.commit()
        await storage.delete_file(old_key)
    return Response(status_code=204)


def _issued_date(created_at: datetime):
    return created_at.astimezone(ZoneInfo("America/Tegucigalpa")).date() if created_at.tzinfo else created_at.date()


async def _printing_context(db: AsyncSession, doctor: User, patient_id: UUID):
    await get_doctor_patient_access(patient_id, db, doctor)
    patient = await db.get(PatientProfile, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    settings = await _get_settings(db, doctor.id)
    degree = await _get_default_degree(db, doctor.id)
    name = (settings.name_override if settings else None) or _doctor_name(doctor)
    if not name:
        raise HTTPException(status_code=422, detail="Configura el nombre para impresión")
    logo = await run_in_threadpool(storage.read_file_bytes, settings.logo_key) if settings and settings.logo_key else None
    return patient, logo, {
        "doctor_name": name,
        "degree": (settings.degree_override if settings else None) or degree or "",
        "clinic_name": (settings.clinic_name if settings else None) or "",
        "phones": [number for number in [settings.phone_1, settings.phone_2] if number] if settings else [],
        "address": (settings.address if settings else None) or "",
        "public_email": (settings.public_email if settings else None) or "",
        "paper_size": settings.paper_size if settings else "A4",
        "show_duration": settings.show_duration if settings else True,
    }


def _pdf_response(pdf: bytes, filename: str) -> Response:
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"',
                 "Cache-Control": "private, no-store"},
    )


@router.get("/patients/{patient_id}/print/prescriptions/{record_id}")
async def print_prescription(
    patient_id: UUID,
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    doctor: User = Depends(require_doctor_role),
):
    patient, logo, settings = await _printing_context(db, doctor, patient_id)
    record = await db.get(MedicalRecord, record_id)
    if not record or record.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    prescriptions = list((await db.scalars(
        select(Prescription).where(
            Prescription.medical_record_id == record_id,
            Prescription.created_by == doctor.id,
        ).order_by(Prescription.created_at, Prescription.id)
    )).all())
    if not prescriptions:
        raise HTTPException(status_code=404, detail="Receta propia no encontrada")
    pdf = await run_in_threadpool(
        render_prescription_pdf, patient=patient, issued_on=_issued_date(prescriptions[0].created_at),
        prescriptions=prescriptions, logo_bytes=logo,
        show_duration=settings["show_duration"],
        **{key: value for key, value in settings.items() if key != "show_duration"},
    )
    return _pdf_response(pdf, "receta-medica.pdf")


@router.get("/patients/{patient_id}/print/orders/{order_id}")
async def print_order(
    patient_id: UUID,
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    doctor: User = Depends(require_doctor_role),
):
    patient, logo, settings = await _printing_context(db, doctor, patient_id)
    order = await db.get(ClinicalOrder, order_id)
    if not order or order.created_by != doctor.id:
        raise HTTPException(status_code=404, detail="Orden propia no encontrada")
    if order.medical_record_id:
        record = await db.get(MedicalRecord, order.medical_record_id)
        belongs_to_patient = bool(record and record.patient_id == patient_id)
    else:
        belongs_to_patient = order.patient_id == patient_id
    if not belongs_to_patient:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    order_type = getattr(order.order_type, "value", order.order_type)
    if order_type == "REFERRAL":
        raise HTTPException(status_code=422, detail="La referencia médica aún no tiene formato de impresión")
    pdf = await run_in_threadpool(
        render_order_pdf, patient=patient, issued_on=_issued_date(order.created_at),
        order=order, logo_bytes=logo,
        **{key: value for key, value in settings.items() if key != "show_duration"},
    )
    return _pdf_response(pdf, "orden-clinica.pdf")
