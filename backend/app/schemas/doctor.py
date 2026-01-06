from typing import Optional, List
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
    id: int
    user_id: int

    class Config:
        orm_mode = True
