import logging
from typing import Generator, Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core import security
from app.core.config import settings
from app.db.session import AsyncSessionLocal, get_db
from app.models.user import User
from app.schemas import token as token_schema

logger = logging.getLogger(__name__)

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = token_schema.TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    try:
        user_id = UUID(token_data.sub)
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalars().first()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure current user has admin privileges."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador.")
    return current_user


async def resolve_patient_profile(
    db: AsyncSession,
    current_user: User,
    profile_id: Optional[str] = None,
) -> "PatientProfile":
    """
    Resolve the patient profile to use for the current request.

    If profile_id is provided, verifies the current user has an active
    FamilyMembership granting access. Otherwise, falls back to the user's
    own profile (via user_id).

    Returns the resolved PatientProfile or raises 403/404.
    """
    from app.models.patient import PatientProfile
    from app.models.family import FamilyMembership

    if profile_id:
        pid = UUID(profile_id)
        result = await db.execute(
            select(FamilyMembership, PatientProfile)
            .join(PatientProfile, FamilyMembership.patient_profile_id == PatientProfile.id)
            .where(
                FamilyMembership.user_id == current_user.id,
                FamilyMembership.patient_profile_id == pid,
                FamilyMembership.is_active == True,
            )
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=403, detail="No tienes acceso a este perfil")
        _, profile = row
        return profile

    # Default: own SELF profile
    result = await db.execute(
        select(PatientProfile).filter(PatientProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return profile

