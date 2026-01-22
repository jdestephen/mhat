"""
Utility functions for secure medical record sharing.
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.sharing import ShareToken
from app.models.hx import MedicalRecord


def generate_share_token(expiration_minutes: int = 20) -> tuple[str, datetime]:
    """
    Generate a cryptographically secure share token.
    
    Args:
        expiration_minutes: How long the token should be valid
        
    Returns:
        Tuple of (token, expires_at)
    """
    # Generate 64-character URL-safe token (48 bytes = 64 base64 chars)
    token = secrets.token_urlsafe(48)
    
    # Calculate expiration
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiration_minutes)
    
    return token, expires_at


async def validate_share_token(
    token: str, 
    db: AsyncSession
) -> Optional[ShareToken]:
    """
    Validate a share token and return it if valid.
    
    Checks:
    - Token exists
    - Not expired
    - Not revoked
    - Not single-use with prior access
    
    Args:
        token: The share token string
        db: Database session
        
    Returns:
        ShareToken if valid, None otherwise
    """
    # Fetch token with relationships
    stmt = select(ShareToken).filter(
        ShareToken.token == token
    ).options(
        selectinload(ShareToken.shared_records),
        selectinload(ShareToken.patient),
        selectinload(ShareToken.created_by)
    )
    result = await db.execute(stmt)
    share_token = result.scalars().first()
    
    if not share_token:
        return None
    
    # Check expiration
    if share_token.expires_at < datetime.now(timezone.utc):
        return None
    
    # Check revocation
    if share_token.is_revoked:
        return None
    
    # Check single-use
    if share_token.is_single_use and share_token.access_count > 0:
        return None
    
    return share_token


async def check_record_ownership(
    patient_id: int,
    record_ids: list[UUID],
    db: AsyncSession
) -> bool:
    """
    Verify that a patient owns all specified medical records.
    
    Args:
        patient_id: The patient profile ID
        record_ids: List of medical record IDs
        db: Database session
        
    Returns:
        True if patient owns all records, False otherwise
    """
    stmt = select(MedicalRecord).filter(
        MedicalRecord.id.in_(record_ids),
        MedicalRecord.patient_id == patient_id
    )
    result = await db.execute(stmt)
    found_records = result.scalars().all()
    
    # All requested records must exist and belong to the patient
    return len(found_records) == len(record_ids)


def is_token_expired(share_token: ShareToken) -> bool:
    """Check if a share token is expired."""
    return share_token.expires_at < datetime.now(timezone.utc)
