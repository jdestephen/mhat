from app.db.base_class import Base

# Import models so they are registered with Base.metadata
from app.models.user import User, DoctorPatientAccess
from app.models.patient import PatientProfile, Medication, Allergy, Condition
from app.models.doctor import DoctorProfile
from app.models.hx import MedicalRecord, Document, Category
