from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

# Import models so they are registered with Base.metadata
from app.models.user import User, DoctorPatientAccess
from app.models.patient import PatientProfile, Medication
from app.models.doctor import DoctorProfile
from app.models.hx import MedicalRecord, Document, Category
