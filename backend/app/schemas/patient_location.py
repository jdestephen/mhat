"""Schemas for patient location CRUD."""
from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class PatientLocationCreate(BaseModel):
    label: str = Field(..., max_length=100)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    is_default: bool = False


class PatientLocationUpdate(BaseModel):
    label: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    address: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    is_default: Optional[bool] = None


class PatientLocationResponse(BaseModel):
    id: int
    patient_profile_id: UUID
    label: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    notes: Optional[str] = None
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True
