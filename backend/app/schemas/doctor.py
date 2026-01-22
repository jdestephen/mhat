from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel
from datetime import date

class DoctorProfileBase(BaseModel):
    date_of_birth: Optional[date] = None
    degree: Optional[str] = None
    short_bio: Optional[str] = None
    workplaces: Optional[List[str]] = []

class DoctorProfileCreate(DoctorProfileBase):
    pass

class DoctorProfileUpdate(DoctorProfileBase):
    pass

class DoctorProfile(DoctorProfileBase):
    id: UUID
    user_id: UUID

    class Config:
        orm_mode = True
