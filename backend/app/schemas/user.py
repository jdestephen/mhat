from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, validator
from app.models.user import UserRole, Sex


class UserBase(BaseModel):
    email: EmailStr
    is_active: Optional[bool] = True
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    sex: Optional[Sex] = None
    city: Optional[str] = None
    country: Optional[str] = None
    role: Optional[UserRole] = UserRole.PATIENT


class UserCreate(UserBase):
    password: str

    @validator("password")
    def validate_password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres.")
        encoded = v.encode('utf-8')
        if len(encoded) > 72:
            raise ValueError(f"La contraseña no puede exceder 72 bytes. Se recibieron {len(encoded)} bytes.")

        # Enforce strong password rules in production (EMAIL_ENABLED=true)
        from app.core.config import settings
        if settings.EMAIL_ENABLED:
            import re
            if not re.search(r'[A-Z]', v):
                raise ValueError("La contraseña debe contener al menos una letra mayúscula.")
            if not re.search(r'[a-z]', v):
                raise ValueError("La contraseña debe contener al menos una letra minúscula.")
            if not re.search(r'[0-9]', v):
                raise ValueError("La contraseña debe contener al menos un número.")

        return v


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    sex: Optional[Sex] = None
    city: Optional[str] = None
    country: Optional[str] = None
    password: Optional[str] = None


class UserInDBBase(UserBase):
    id: Optional[UUID] = None

    class Config:
        orm_mode = True


class User(UserInDBBase):
    role: UserRole
    is_email_verified: bool = False
    created_at: datetime
    pass


# --- Auth request/response schemas ---

class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @validator("new_password")
    def validate_password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres.")
        encoded = v.encode('utf-8')
        if len(encoded) > 72:
            raise ValueError(f"La contraseña no puede exceder 72 bytes. Se recibieron {len(encoded)} bytes.")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @validator("new_password")
    def validate_password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres.")
        encoded = v.encode('utf-8')
        if len(encoded) > 72:
            raise ValueError(f"La contraseña no puede exceder 72 bytes. Se recibieron {len(encoded)} bytes.")
        return v
