from app.db.base_class import Base

# Import models so they are registered with Base.metadata
from app.models.user import User, DoctorPatientAccess
from app.models.patient import PatientProfile, Medication, Allergy, Condition
from app.models.doctor import DoctorProfile
from app.models.hx import MedicalRecord, Document, Category, MedicalDiagnosis
from app.models.family import FamilyMembership
from app.models.sharing import ShareToken, SharedRecord, ShareAccessLog
from app.models.organization import HealthCenter, HealthCenterMembership
from app.models.clinical import Prescription, ClinicalOrder
