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
    def validate_password_length(cls, v):
        encoded = v.encode('utf-8')
        print(f"DEBUG: Password received. Length: {len(v)} chars, {len(encoded)} bytes. Value (first 10): {v[:10]}")
        if len(encoded) > 72:
            raise ValueError(f"Password cannot be longer than 72 bytes. Received {len(encoded)} bytes.")
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
    created_at: datetime
    pass
