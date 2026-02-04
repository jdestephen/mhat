from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.core import security
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.patient import PatientProfile
from app.models.doctor import DoctorProfile
from app.schemas import user as user_schema, token as token_schema

router = APIRouter()

@router.post("/login", response_model=token_schema.Token)
async def login_access_token(
    db: AsyncSession = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    result = await db.execute(select(User).filter(User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not security.verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=user_schema.User)
async def register_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: user_schema.UserCreate,
) -> Any:
    result = await db.execute(select(User).filter(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    user = User(
        email=user_in.email,
        password=security.get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        # date_of_birth moved to Profile
        city=user_in.city,
        country=user_in.country,
        is_active=True,
        role=user_in.role
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create Profile based on Role
    if user.role == UserRole.PATIENT:
        # Create patient profile with user's name
        profile = PatientProfile(
            user_id=user.id,
            first_name=user_in.first_name,
            last_name=user_in.last_name
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        
        # Create self-referential family membership
        from app.models.family import FamilyMembership, RelationshipType, AccessLevel
        membership = FamilyMembership(
            user_id=user.id,
            patient_profile_id=profile.id,
            relationship_type=RelationshipType.SELF,
            access_level=AccessLevel.FULL_ACCESS,
            can_manage_family=True,
            created_by=user.id,
            is_active=True
        )
        db.add(membership)
    elif user.role == UserRole.DOCTOR:
        profile = DoctorProfile(user_id=user.id)
        db.add(profile)
    
    await db.commit()
    await db.refresh(user)
    return user

@router.get("/me", response_model=user_schema.User)
def read_users_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return current_user

@router.put("/me", response_model=user_schema.User)
async def update_current_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: user_schema.UserUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update current user's information.
    Email cannot be changed through this endpoint.
    """
    # Update fields from the input
    update_data = user_in.dict(exclude_unset=True)
    
    # Remove email from update_data if somehow included (safety check)
    update_data.pop('email', None)
    update_data.pop('role', None)  # Also don't allow role changes
    update_data.pop('is_active', None)  # Or active status changes
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    return current_user
