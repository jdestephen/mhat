import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.rate_limit import rate_limiter, get_client_ip
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.patient import PatientProfile
from app.models.doctor import DoctorProfile, DoctorApprovalStatus
from app.models.verification_token import VerificationToken, TokenType
from app.schemas import user as user_schema, token as token_schema
from app.services.email import (
    send_verification_email,
    send_password_reset_email,
    send_doctor_registration_notification,
)

router = APIRouter()


async def _create_token(db: AsyncSession, user_id: Any, token_type: TokenType) -> str:
    """Create a verification token, invalidating any existing unused tokens of the same type."""
    # Invalidate existing unused tokens of the same type
    result = await db.execute(
        select(VerificationToken).filter(
            VerificationToken.user_id == user_id,
            VerificationToken.token_type == token_type,
            VerificationToken.used_at.is_(None),
        )
    )
    for old_token in result.scalars().all():
        old_token.used_at = datetime.now(timezone.utc)

    # Set expiry based on token type
    if token_type == TokenType.EMAIL_VERIFICATION:
        expire_hours = settings.EMAIL_VERIFY_TOKEN_EXPIRE_HOURS
    else:
        expire_hours = settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS

    token_value = secrets.token_urlsafe(32)
    token = VerificationToken(
        user_id=user_id,
        token=token_value,
        token_type=token_type,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=expire_hours),
    )
    db.add(token)
    await db.flush()
    return token_value


async def _validate_token(db: AsyncSession, token_value: str, token_type: TokenType) -> VerificationToken:
    """Validate a token: exists, correct type, not used, not expired."""
    result = await db.execute(
        select(VerificationToken).filter(
            VerificationToken.token == token_value,
            VerificationToken.token_type == token_type,
        )
    )
    token = result.scalars().first()

    if not token:
        raise HTTPException(status_code=400, detail="Token inválido.")
    if token.used_at is not None:
        raise HTTPException(status_code=400, detail="Este enlace ya fue utilizado.")
    if token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Este enlace ha expirado. Solicita uno nuevo.")

    return token


@router.get("/config")
async def get_auth_config():
    """
    Public endpoint: returns auth configuration for the frontend.
    No authentication required.
    """
    return {
        "dev_mode": not settings.EMAIL_ENABLED,
        "require_strong_password": settings.EMAIL_ENABLED,
        "email_verification_required": settings.EMAIL_ENABLED,
    }


@router.post("/login", response_model=token_schema.Token)
async def login_access_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    rate_limiter.check(get_client_ip(request), "login", max_requests=5, window_seconds=60)
    result = await db.execute(select(User).filter(User.email == form_data.username))
    user = result.scalars().first()

    if not user or not security.verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Correo o contraseña incorrectos.")
    elif not user.is_email_verified:
        raise HTTPException(
            status_code=403,
            detail="Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.",
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo.")

    # Gate pending/rejected doctors
    if user.role == UserRole.DOCTOR:
        result_dp = await db.execute(
            select(DoctorProfile).filter(DoctorProfile.user_id == user.id)
        )
        doctor_profile = result_dp.scalars().first()
        if doctor_profile and doctor_profile.approval_status == DoctorApprovalStatus.PENDING:
            raise HTTPException(
                status_code=403,
                detail="Tu cuenta de médico está pendiente de aprobación. Te notificaremos cuando sea aprobada.",
            )
        if doctor_profile and doctor_profile.approval_status == DoctorApprovalStatus.REJECTED:
            reason = doctor_profile.rejection_reason or "No se proporcionó una razón."
            raise HTTPException(
                status_code=403,
                detail=f"Tu solicitud de cuenta de médico fue rechazada. Razón: {reason}",
            )

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )

    # Create refresh token
    from app.models.refresh_token import RefreshToken

    raw_refresh = security.create_refresh_token_value()
    refresh_expires = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=security.hash_refresh_token(raw_refresh),
        expires_at=refresh_expires,
        device_info=request.headers.get("user-agent", "")[:200],
    )
    db.add(refresh_token)
    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=token_schema.Token)
async def refresh_access_token(
    *,
    db: AsyncSession = Depends(get_db),
    body: token_schema.RefreshTokenRequest,
) -> Any:
    """Exchange a valid refresh token for a new access + refresh token pair."""
    from app.models.refresh_token import RefreshToken

    token_hash = security.hash_refresh_token(body.refresh_token)
    result = await db.execute(
        select(RefreshToken).filter(RefreshToken.token_hash == token_hash)
    )
    stored_token = result.scalars().first()

    if not stored_token or not stored_token.is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado. Inicia sesión de nuevo.",
        )

    # Revoke old refresh token (rotation)
    stored_token.revoked_at = datetime.now(timezone.utc)

    # Issue new pair
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access = security.create_access_token(
        stored_token.user_id, expires_delta=access_token_expires
    )
    new_raw_refresh = security.create_refresh_token_value()
    refresh_expires = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    new_refresh_token = RefreshToken(
        user_id=stored_token.user_id,
        token_hash=security.hash_refresh_token(new_raw_refresh),
        expires_at=refresh_expires,
    )
    db.add(new_refresh_token)
    await db.commit()

    return {
        "access_token": new_access,
        "refresh_token": new_raw_refresh,
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout(
    *,
    db: AsyncSession = Depends(get_db),
    body: token_schema.RefreshTokenRequest,
) -> Any:
    """Revoke a refresh token (logout)."""
    from app.models.refresh_token import RefreshToken

    token_hash = security.hash_refresh_token(body.refresh_token)
    result = await db.execute(
        select(RefreshToken).filter(RefreshToken.token_hash == token_hash)
    )
    stored_token = result.scalars().first()
    if stored_token and stored_token.revoked_at is None:
        stored_token.revoked_at = datetime.now(timezone.utc)
        await db.commit()

    return {"message": "Sesión cerrada exitosamente."}


@router.post("/register", response_model=user_schema.User)
async def register_user(
    *,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_in: user_schema.UserCreate,
) -> Any:
    rate_limiter.check(get_client_ip(request), "register", max_requests=3, window_seconds=60)
    result = await db.execute(select(User).filter(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un usuario con este correo electrónico.",
        )

    user = User(
        email=user_in.email,
        password=security.get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        city=user_in.city,
        country=user_in.country,
        # In dev mode (EMAIL_ENABLED=false), auto-verify and activate
        is_active=not settings.EMAIL_ENABLED,
        is_email_verified=not settings.EMAIL_ENABLED,
        role=user_in.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create Profile based on Role
    if user.role == UserRole.PATIENT:
        # Always create a fresh profile for the new user
        profile = PatientProfile(
            user_id=user.id,
            first_name=user_in.first_name,
            last_name=user_in.last_name,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

        from app.models.family import FamilyMembership, RelationshipType, AccessLevel
        membership = FamilyMembership(
            user_id=user.id,
            patient_profile_id=profile.id,
            relationship_type=RelationshipType.SELF,
            access_level=AccessLevel.FULL_ACCESS,
            can_manage_family=True,
            created_by=user.id,
            is_active=True,
        )
        db.add(membership)

        # Check for doctor-created profiles matching this email → create claim requests
        existing_profile_result = await db.execute(
            select(PatientProfile).filter(
                PatientProfile.email == user_in.email,
                PatientProfile.user_id.is_(None),
            )
        )
        existing_profiles = existing_profile_result.scalars().all()

        if existing_profiles:
            from app.models.profile_claim import ProfileClaimRequest, ClaimStatus
            for ep in existing_profiles:
                claim = ProfileClaimRequest(
                    user_id=user.id,
                    patient_profile_id=ep.id,
                    status=ClaimStatus.PENDING,
                )
                db.add(claim)
    elif user.role == UserRole.DOCTOR:
        profile = DoctorProfile(
            user_id=user.id,
            college_number=user_in.college_number,
            verification_phone=user_in.verification_phone,
            approval_status=DoctorApprovalStatus.PENDING,
        )
        db.add(profile)

    # Generate verification token and send email
    token_value = await _create_token(db, user.id, TokenType.EMAIL_VERIFICATION)
    await db.commit()
    await db.refresh(user)

    await send_verification_email(user.email, token_value)

    # Notify admins about new doctor registration
    if user.role == UserRole.DOCTOR:
        doctor_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email
        await send_doctor_registration_notification(
            doctor_name=doctor_name,
            college_number=user_in.college_number or "",
            phone=user_in.verification_phone or "",
            email=user.email,
        )

    return user


@router.post("/verify-email")
async def verify_email(
    *,
    db: AsyncSession = Depends(get_db),
    body: user_schema.VerifyEmailRequest,
) -> Any:
    """Verify user email with token from the verification link."""
    token = await _validate_token(db, body.token, TokenType.EMAIL_VERIFICATION)

    # Find and activate user
    result = await db.execute(select(User).filter(User.id == token.user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.is_email_verified = True
    user.is_active = True
    token.used_at = datetime.now(timezone.utc)

    await db.commit()
    return {"message": "Correo electrónico verificado exitosamente. Ya puedes iniciar sesión."}


@router.post("/resend-verification")
async def resend_verification(
    *,
    db: AsyncSession = Depends(get_db),
    body: user_schema.ResendVerificationRequest,
) -> Any:
    """Resend verification email. Always returns 200 to prevent email enumeration."""
    result = await db.execute(select(User).filter(User.email == body.email))
    user = result.scalars().first()

    if user and not user.is_email_verified:
        token_value = await _create_token(db, user.id, TokenType.EMAIL_VERIFICATION)
        await db.commit()
        await send_verification_email(user.email, token_value)

    return {"message": "Si el correo está registrado y no verificado, recibirás un enlace de verificación."}


@router.post("/forgot-password")
async def forgot_password(
    *,
    request: Request,
    db: AsyncSession = Depends(get_db),
    body: user_schema.ForgotPasswordRequest,
) -> Any:
    """Send password reset email. Always returns 200 to prevent email enumeration."""
    rate_limiter.check(get_client_ip(request), "forgot_password", max_requests=3, window_seconds=60)
    result = await db.execute(select(User).filter(User.email == body.email))
    user = result.scalars().first()

    if user and user.is_email_verified:
        token_value = await _create_token(db, user.id, TokenType.PASSWORD_RESET)
        await db.commit()
        await send_password_reset_email(user.email, token_value)

    return {"message": "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."}


@router.post("/reset-password")
async def reset_password(
    *,
    db: AsyncSession = Depends(get_db),
    body: user_schema.ResetPasswordRequest,
) -> Any:
    """Reset password using token from the reset email."""
    token = await _validate_token(db, body.token, TokenType.PASSWORD_RESET)

    result = await db.execute(select(User).filter(User.id == token.user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.password = security.get_password_hash(body.new_password)
    token.used_at = datetime.now(timezone.utc)

    await db.commit()
    return {"message": "Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña."}


@router.post("/change-password")
async def change_password(
    *,
    db: AsyncSession = Depends(get_db),
    body: user_schema.ChangePasswordRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Change password for the authenticated user. Requires current password."""
    if not security.verify_password(body.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta.")

    current_user.password = security.get_password_hash(body.new_password)
    await db.commit()
    return {"message": "Contraseña actualizada exitosamente."}


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
    update_data = user_in.dict(exclude_unset=True)

    # Safety: don't allow protected field changes
    update_data.pop('email', None)
    update_data.pop('role', None)
    update_data.pop('is_active', None)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)
    return current_user


# =====================
# Doctor Document Upload
# =====================

from fastapi import File, Form, UploadFile as FastAPIUpload
from typing import Optional as OptionalType


@router.post("/doctor/upload-documents-registration")
async def upload_doctor_documents_registration(
    *,
    db: AsyncSession = Depends(get_db),
    email: str = Form(...),
    password: str = Form(...),
    identity_document: OptionalType[FastAPIUpload] = File(None),
    college_document: OptionalType[FastAPIUpload] = File(None),
):
    """
    Upload verification documents immediately after registration.
    Uses email/password instead of token because the doctor is pending and cannot login.
    """
    if not identity_document and not college_document:
        raise HTTPException(status_code=400, detail="Debes subir al menos un documento.")

    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()

    if not user or not security.verify_password(password, user.password):
        raise HTTPException(status_code=400, detail="Credenciales inválidas para subir documentos.")
    
    if user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Solo los médicos pueden subir documentos.")

    result_dp = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
    profile = result_dp.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de médico no encontrado.")

    from app.services.document_verification import (
        verify_doctor_documents,
        DocumentValidationError,
    )

    try:
        verification_result = await verify_doctor_documents(
            db=db,
            profile=profile,
            identity_file=identity_document,
            college_file=college_document,
        )
    except DocumentValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": "Documentos procesados exitosamente.",
        "profile": {
            "dni": profile.dni,
            "college_number": profile.college_number,
        },
        **verification_result,
    }


@router.post("/doctor/upload-documents")
async def upload_doctor_documents(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    identity_document: OptionalType[FastAPIUpload] = File(None),
    college_document: OptionalType[FastAPIUpload] = File(None),
):
    """
    Upload verification documents for a doctor profile.

    Accepts identity document (DNI/DPI photo) and/or college registration document.
    Runs OCR to extract fields and auto-fills profile if values weren't manually set.
    """
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Solo los médicos pueden subir documentos de verificación.")

    if not identity_document and not college_document:
        raise HTTPException(status_code=400, detail="Debes subir al menos un documento.")

    # Get doctor profile
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de médico no encontrado.")

    from app.services.document_verification import (
        verify_doctor_documents,
        DocumentValidationError,
    )

    try:
        verification_result = await verify_doctor_documents(
            db=db,
            profile=profile,
            identity_file=identity_document,
            college_file=college_document,
        )
    except DocumentValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": "Documentos procesados exitosamente.",
        "profile": {
            "dni": profile.dni,
            "college_number": profile.college_number,
        },
        **verification_result,
    }

