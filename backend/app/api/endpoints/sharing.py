"""
API endpoints for secure medical record sharing.
"""
from datetime import datetime
from typing import Any, Optional
from uuid import UUID
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.models.patient import PatientProfile
from app.models.hx import MedicalRecord
from app.models.sharing import ShareToken, SharedRecord, ShareAccessLog
from app.schemas import sharing as sharing_schema
from app.utils.sharing import (
    generate_share_token,
    validate_share_token,
    check_record_ownership,
    is_token_expired
)


router = APIRouter()


@router.post("/share", response_model=sharing_schema.ShareTokenResponse)
async def create_share_link(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    share_request: sharing_schema.CreateShareRequest,
) -> Any:
    """
    Create a secure, time-limited share link for medical records or summary.
    
    **Types:**
    - SPECIFIC_RECORDS: Share specific medical records (requires record_ids)
    - SUMMARY: Share full medical history summary
    
    **Security:**
    - Requires authentication
    - Validates patient owns all records (for SPECIFIC_RECORDS)
    - Generates cryptographically secure token
    - Sets time-based expiration
    """
    # Get patient profile
    result = await db.execute(
        select(PatientProfile).filter(PatientProfile.user_id == current_user.id)
    )
    patient_profile = result.scalars().first()
    
    if not patient_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    # For SPECIFIC_RECORDS, verify patient owns all requested records
    if share_request.share_type == "SPECIFIC_RECORDS":
        if not share_request.record_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="record_ids is required for SPECIFIC_RECORDS share type"
            )
        
        owns_all = await check_record_ownership(
            patient_profile.id,
            share_request.record_ids,
            db
        )
        
        if not owns_all:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not own all specified medical records"
            )
    
    # Generate token
    token, expires_at = generate_share_token(share_request.expiration_minutes)
    
    # Create share token
    share_token = ShareToken(
        id=uuid.uuid4(),
        token=token,
        patient_id=patient_profile.id,
        created_by_user_id=current_user.id,
        expires_at=expires_at,
        expiration_minutes=share_request.expiration_minutes,
        share_type=share_request.share_type,
        is_single_use=share_request.is_single_use,
        recipient_name=share_request.recipient_name,
        recipient_email=share_request.recipient_email,
        purpose=share_request.purpose,
    )
    db.add(share_token)
    await db.flush()  # Get the ID
    
    # Create shared record mappings (only for SPECIFIC_RECORDS)
    record_count = 0
    if share_request.share_type == "SPECIFIC_RECORDS" and share_request.record_ids:
        for record_id in share_request.record_ids:
            shared_record = SharedRecord(
                id=uuid.uuid4(),
                share_token_id=share_token.id,
                medical_record_id=record_id
            )
            db.add(shared_record)
        record_count = len(share_request.record_ids)
    
    await db.commit()
    await db.refresh(share_token)
    
    # Build share URL based on type
    base_url = settings.FRONTEND_URL.rstrip("/")
    if share_request.share_type == "SUMMARY":
        share_url = f"{base_url}/shared/{token}/summary"
    else:
        share_url = f"{base_url}/shared/{token}"
    
    return sharing_schema.ShareTokenResponse(
        share_url=share_url,
        token=token,
        expires_at=expires_at,
        record_count=record_count,
        expiration_minutes=share_request.expiration_minutes
    )


@router.get("/shares", response_model=sharing_schema.ShareTokenListResponse)
async def list_my_shares(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    include_expired: bool = False,
    include_revoked: bool = False,
) -> Any:
    """
    List all share links created by the current user.
    
    Query params:
    - include_expired: Include expired tokens (default: False)
    - include_revoked: Include revoked tokens (default: False)
    """
    # Get patient profile
    result = await db.execute(
        select(PatientProfile).filter(PatientProfile.user_id == current_user.id)
    )
    patient_profile = result.scalars().first()
    
    if not patient_profile:
        return sharing_schema.ShareTokenListResponse(shares=[])
    
    # Build query
    stmt = select(ShareToken).filter(
        ShareToken.patient_id == patient_profile.id
    ).options(
        selectinload(ShareToken.shared_records)
    ).order_by(ShareToken.created_at.desc())
    
    result = await db.execute(stmt)
    share_tokens = result.scalars().all()
    
    # Filter and format
    shares = []
    for token in share_tokens:
        is_expired = is_token_expired(token)
        
        # Apply filters
        if not include_expired and is_expired:
            continue
        if not include_revoked and token.is_revoked:
            continue
        
        shares.append(sharing_schema.ShareTokenInfo(
            id=token.id,
            token=token.token,
            created_at=token.created_at,
            expires_at=token.expires_at,
            is_expired=is_expired,
            is_revoked=token.is_revoked,
            is_single_use=token.is_single_use,
            record_count=len(token.shared_records),
            access_count=token.access_count,
            share_type=token.share_type,
            recipient_name=token.recipient_name,
            recipient_email=token.recipient_email,
            purpose=token.purpose
        ))
    
    return sharing_schema.ShareTokenListResponse(shares=shares)


@router.delete("/share/{token_id}", response_model=sharing_schema.RevokeShareResponse)
async def revoke_share_link(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    token_id: UUID,
) -> Any:
    """
    Revoke a share link.
    
    Only the creator can revoke their own share links.
    """
    # Get patient profile
    result = await db.execute(
        select(PatientProfile).filter(PatientProfile.user_id == current_user.id)
    )
    patient_profile = result.scalars().first()
    
    if not patient_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    # Get share token
    result = await db.execute(
        select(ShareToken).filter(
            ShareToken.id == token_id,
            ShareToken.patient_id == patient_profile.id
        )
    )
    share_token = result.scalars().first()
    
    if not share_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found or you don't have permission to revoke it"
        )
    
    # Revoke the token
    share_token.is_revoked = True
    await db.commit()
    
    return sharing_schema.RevokeShareResponse(
        message="Share link revoked successfully",
        token_id=token_id
    )


@router.get("/shared/{token}", response_model=sharing_schema.SharedRecordsViewResponse)
async def view_shared_records(
    *,
    db: AsyncSession = Depends(get_db),
    token: str,
    request: Request,
) -> Any:
    """
    View shared medical records using a share token.
    
    **Public endpoint** - No authentication required.
    
    Security features:
    - Token validation (expiration, revocation, single-use)
    - Access logging (IP, user agent, timestamp)
    - Rate limiting (TODO: implement)
    """
    # Validate token
    share_token = await validate_share_token(token, db)
    
    if not share_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found, expired, or already used"
        )
    
    # Log access
    access_log = ShareAccessLog(
        id=uuid.uuid4(),
        share_token_id=share_token.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    db.add(access_log)
    
    # Increment access count
    stmt = update(ShareToken).where(
        ShareToken.id == share_token.id
    ).values(access_count=ShareToken.access_count + 1)
    await db.execute(stmt)
    
    await db.commit()
    
    # Fetch shared records with details
    record_ids = [sr.medical_record_id for sr in share_token.shared_records]
    stmt = select(MedicalRecord).filter(
        MedicalRecord.id.in_(record_ids)
    ).options(
        selectinload(MedicalRecord.documents),
        selectinload(MedicalRecord.category),
        selectinload(MedicalRecord.diagnoses)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    # Format  response
    shared_records = []
    for record in records:
        shared_records.append(sharing_schema.SharedRecordResponse(
            id=record.id,
            motive=record.motive,
            diagnosis=record.diagnoses[0].diagnosis if record.diagnoses and len(record.diagnoses) > 0 else None,
            category={"id": record.category.id, "name": record.category.name} if record.category else None,
            notes=record.notes,
            tags=record.tags,
            status=record.status.value,
            created_at=record.created_at,
            documents=[{
                "id": str(doc.id),
                "filename": doc.filename,
                "url": doc.url
            } for doc in record.documents] if record.documents else []
        ))
    
    # Get creator name
    created_by = share_token.created_by
    full_name = f"{created_by.first_name} {created_by.last_name}".strip() if created_by.first_name or created_by.last_name else None
    shared_by = full_name if full_name else created_by.email
    
    return sharing_schema.SharedRecordsViewResponse(
        records=shared_records,
        shared_by=shared_by,
        expires_at=share_token.expires_at,
        purpose=share_token.purpose,
        is_expired=is_token_expired(share_token),
        access_count=share_token.access_count
    )


@router.get("/shared/{token}/summary", response_model=sharing_schema.MedicalHistorySummaryResponse)
async def view_medical_history_summary(
    *,
    db: AsyncSession = Depends(get_db),
    token: str,
    request: Request,
) -> Any:
    """
    View medical history summary using a share token.
    
    **Public endpoint** - No authentication required.
    
    Returns comprehensive medical history including:
    - Patient demographics (name, age, sex)
    - Active medications
    - Active conditions (diagnoses)
    - Active allergies
    - Recent 7 medical records
    
    Security features:
    - Token validation (expiration, revocation, single-use)
    - Access logging (IP, user agent, timestamp)
    - Immediate revocation support
    """
    from app.services.summary import build_medical_history_summary
    
    # Validate token
    share_token = await validate_share_token(token, db)
    
    if not share_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found, expired, or already used"
        )
    
    # Verify this is a SUMMARY share type
    if share_token.share_type != "SUMMARY":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This token is not for a medical history summary"
        )
    
    # Log access
    access_log = ShareAccessLog(
        id=uuid.uuid4(),
        share_token_id=share_token.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    db.add(access_log)
    
    # Increment access count
    stmt = update(ShareToken).where(
        ShareToken.id == share_token.id
    ).values(access_count=ShareToken.access_count + 1)
    await db.execute(stmt)
    
    await db.commit()
    
    # Fetch patient profile and user
    result = await db.execute(
        select(PatientProfile).filter(
            PatientProfile.id == share_token.patient_id
        ).options(selectinload(PatientProfile.user))
    )
    patient_profile = result.scalars().first()
    
    if not patient_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    # Build summary data
    summary_data = await build_medical_history_summary(
        patient_profile,
        patient_profile.user,
        db
    )
    
    # Get creator name
    created_by = share_token.created_by
    full_name = f"{created_by.first_name} {created_by.last_name}".strip() if created_by.first_name or created_by.last_name else None
    shared_by = full_name if full_name else created_by.email
    
    return sharing_schema.MedicalHistorySummaryResponse(
        patient_info=summary_data["patient_info"],
        active_medications=summary_data["active_medications"],
        conditions=summary_data["conditions"],
        allergies=summary_data["allergies"],
        recent_records=summary_data["recent_records"],
        shared_by=shared_by,
        expires_at=share_token.expires_at,
        purpose=share_token.purpose,
        is_expired=is_token_expired(share_token),
        access_count=share_token.access_count
    )


@router.get("/shared/{token}/record/{record_id}", response_model=sharing_schema.SharedRecordResponse)
async def view_summary_record_detail(
    *,
    db: AsyncSession = Depends(get_db),
    token: str,
    record_id: UUID,
    request: Request,
) -> Any:
    """
    View individual medical record detail from a summary share.
    
    **Public endpoint** - No authentication required.
    
    Returns full details of a specific medical record including:
    - Diagnosis (all diagnoses with primary first)
    - Notes
    - Tags
    - Documents
    
    Security:
    - Token must be valid SUMMARY type
    - Record must belong to the patient in the share
    """
    # Validate token
    share_token = await validate_share_token(token, db)
    
    if not share_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found, expired, or already used"
        )
    
    # Verify this is a SUMMARY share type
    if share_token.share_type != "SUMMARY":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This token is not for a medical history summary"
        )
    
    # Fetch the specific record and verify it belongs to this patient
    stmt = select(MedicalRecord).filter(
        and_(
            MedicalRecord.id == record_id,
            MedicalRecord.patient_id == share_token.patient_id
        )
    ).options(
        selectinload(MedicalRecord.documents),
        selectinload(MedicalRecord.category),
        selectinload(MedicalRecord.diagnoses),
        selectinload(MedicalRecord.prescriptions),
        selectinload(MedicalRecord.clinical_orders)
    )
    
    result = await db.execute(stmt)
    record = result.scalars().first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical record not found or does not belong to this patient"
        )
    
    # Format diagnosis - combine all diagnoses with primary first
    diagnosis_text = None
    if record.diagnoses and len(record.diagnoses) > 0:
        # Sort by rank (primary=1 first)
        sorted_diagnoses = sorted(record.diagnoses, key=lambda d: d.rank)
        diagnosis_text = sorted_diagnoses[0].diagnosis
        if len(sorted_diagnoses) > 1:
            additional = ", ".join([d.diagnosis for d in sorted_diagnoses[1:]])
            diagnosis_text += f"; {additional}"
    
    return sharing_schema.SharedRecordResponse(
        id=record.id,
        motive=record.motive,
        diagnosis=diagnosis_text,
        diagnoses=[
            {"id": str(d.id), "diagnosis": d.diagnosis}
            for d in (sorted(record.diagnoses, key=lambda d: d.rank) if record.diagnoses else [])
        ],
        category={"id": record.category.id, "name": record.category.name} if record.category else None,
        notes=record.notes,
        tags=record.tags,
        status=record.status.value,
        brief_history=record.brief_history if hasattr(record, "brief_history") else None,
        red_flags=record.red_flags if hasattr(record, "red_flags") else None,
        key_finding=record.key_finding if hasattr(record, "key_finding") else None,
        actions_today=record.actions_today if hasattr(record, "actions_today") else None,
        plan_bullets=record.plan_bullets if hasattr(record, "plan_bullets") else None,
        follow_up_interval=record.follow_up_interval if hasattr(record, "follow_up_interval") else None,
        follow_up_with=record.follow_up_with if hasattr(record, "follow_up_with") else None,
        patient_instructions=record.patient_instructions if hasattr(record, "patient_instructions") else None,
        prescriptions=[{
            "id": str(rx.id),
            "medication_name": rx.medication_name,
            "dosage": rx.dosage,
            "frequency": rx.frequency,
            "duration": rx.duration,
            "instructions": rx.instructions,
            "created_at": rx.created_at.isoformat() if rx.created_at else None,
        } for rx in record.prescriptions] if record.prescriptions else [],
        clinical_orders=[{
            "id": str(order.id),
            "order_type": order.order_type.value if hasattr(order.order_type, "value") else order.order_type,
            "description": order.description,
            "urgency": order.urgency.value if hasattr(order.urgency, "value") else order.urgency,
            "reason": order.reason,
            "referral_to": order.referral_to,
        } for order in record.clinical_orders] if record.clinical_orders else [],
        created_at=record.created_at,
        verified_at=record.verified_at,
        documents=[{
            "id": str(doc.id),
            "filename": doc.filename,
            "url": doc.url
        } for doc in record.documents] if record.documents else []
    )


@router.get("/shared/{token}/document/{document_id}")
async def view_shared_document(
    *,
    db: AsyncSession = Depends(get_db),
    token: str,
    document_id: UUID,
    request: Request,
) -> Any:
    """
    Access a document through a share token.
    
    **Public endpoint** - No authentication required.
    
    Validates the share token and ensures the document belongs
    to a medical record of the patient in the share.
    
    Returns a redirect to the S3 signed URL.
    """
    from fastapi.responses import RedirectResponse
    from app.models.hx import Document
    
    # Validate token (accepts both SPECIFIC_RECORDS and SUMMARY types)
    share_token = await validate_share_token(token, db)
    
    if not share_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found, expired, or already used"
        )
    
    # Fetch the document and verify it belongs to this patient's records
    stmt = select(Document).join(
        MedicalRecord,
        Document.medical_record_id == MedicalRecord.id
    ).filter(
        and_(
            Document.id == document_id,
            MedicalRecord.patient_id == share_token.patient_id
        )
    )
    
    result = await db.execute(stmt)
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or does not belong to this patient"
        )
    
    # Return redirect to the S3 URL
    return RedirectResponse(url=document.url)
