"""
Document verification service for doctor registration.

Orchestrates file upload + OCR processing + DoctorProfile update.
"""
import logging
import os
import tempfile
from typing import Optional

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.doctor import DoctorProfile
from app.services.storage import upload_file, get_presigned_url
from app.services.ocr import (
    process_identity_document,
    process_college_document,
    OcrExtractionResult,
)

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class DocumentValidationError(Exception):
    """Raised when a document fails validation."""
    pass


def validate_document(file: UploadFile, label: str) -> None:
    """Validate file type and size."""
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise DocumentValidationError(
            f"{label}: tipo de archivo no válido ({file.content_type}). "
            "Usa JPG, PNG, WEBP o PDF."
        )


async def process_and_store_document(
    file: UploadFile,
    folder: str,
) -> tuple[str, str]:
    """
    Upload a document to storage and return (s3_key, temp_file_path).
    The caller is responsible for cleaning up the temp file.
    """
    storage_result = await upload_file(file, folder=folder)

    # Save a local copy for OCR processing
    await file.seek(0)
    content = await file.read()

    suffix = f".{file.filename.split('.')[-1]}" if file.filename else ".bin"
    temp_fd, temp_path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(temp_fd, "wb") as f:
        f.write(content)

    return storage_result.s3_key, temp_path


async def verify_doctor_documents(
    *,
    db: AsyncSession,
    profile: DoctorProfile,
    identity_file: Optional[UploadFile] = None,
    college_file: Optional[UploadFile] = None,
) -> dict:
    """
    Process uploaded verification documents for a doctor.

    1. Validates and uploads files to storage
    2. Runs OCR on each document
    3. Merges extracted data into profile
    4. Returns combined OCR results for the frontend

    Auto-fill logic: if the doctor has NOT manually entered DNI or college_number,
    the OCR-extracted values are written to the profile. If they already have
    manual values, OCR data is stored as suggestions only.
    """
    ocr_data: dict = profile.ocr_extracted_data or {}
    temp_files: list[str] = []

    try:
        # --- Identity document ---
        if identity_file:
            validate_document(identity_file, "Documento de identidad")
            s3_key, temp_path = await process_and_store_document(
                identity_file, folder="doctor-docs/identity"
            )
            temp_files.append(temp_path)
            profile.identity_document_key = s3_key

            # OCR
            identity_result = process_identity_document(temp_path)
            ocr_data["identity"] = identity_result.to_dict()

            # Auto-fill DNI if not manually entered
            if identity_result.extracted_dni and not profile.dni:
                profile.dni = identity_result.extracted_dni
                logger.info("Auto-filled DNI from OCR: %s", identity_result.extracted_dni)

        # --- College document ---
        if college_file:
            validate_document(college_file, "Documento de colegiación")
            s3_key, temp_path = await process_and_store_document(
                college_file, folder="doctor-docs/college"
            )
            temp_files.append(temp_path)
            profile.college_document_key = s3_key

            # OCR
            college_result = process_college_document(temp_path)
            ocr_data["college"] = college_result.to_dict()

            # Auto-fill college number if not manually entered
            if college_result.extracted_college_number and not profile.college_number:
                profile.college_number = college_result.extracted_college_number
                logger.info(
                    "Auto-filled college_number from OCR: %s",
                    college_result.extracted_college_number,
                )

        # Save OCR data
        profile.ocr_extracted_data = ocr_data
        profile.ocr_processed = True

        await db.commit()
        await db.refresh(profile)

        # Build response with presigned URLs
        result = {
            "ocr_data": ocr_data,
            "auto_filled": {},
        }

        if identity_file and profile.identity_document_key:
            result["identity_document_url"] = get_presigned_url(profile.identity_document_key)
            identity_ocr = ocr_data.get("identity", {})
            if identity_ocr.get("extracted_dni"):
                result["auto_filled"]["dni"] = identity_ocr["extracted_dni"]

        if college_file and profile.college_document_key:
            result["college_document_url"] = get_presigned_url(profile.college_document_key)
            college_ocr = ocr_data.get("college", {})
            if college_ocr.get("extracted_college_number"):
                result["auto_filled"]["college_number"] = college_ocr["extracted_college_number"]

        return result

    finally:
        # Clean up temp files
        for path in temp_files:
            try:
                os.unlink(path)
            except OSError:
                pass
