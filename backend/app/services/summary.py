"""
Service for aggregating medical history summary data.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.patient import PatientProfile, Medication, Condition, Allergy, MedicationStatus, ConditionStatus
from app.models.hx import MedicalRecord
from app.models.user import User, Sex
from app.schemas import sharing as sharing_schema


def calculate_age(date_of_birth: Optional[datetime]) -> dict:
    """
    Calculate age from date of birth.
    Returns years and months, with display string.
    For children under 2 years, shows age in months.
    """
    if not date_of_birth:
        return {
            "years": None,
            "months": None,
            "display": "Edad no disponible"
        }
    
    today = datetime.now()
    years = today.year - date_of_birth.year
    
    # Adjust if birthday hasn't occurred yet this year
    if (today.month, today.day) < (date_of_birth.month, date_of_birth.day):
        years -= 1
    
    # For children under 2, calculate months
    if years < 2:
        months = (today.year - date_of_birth.year) * 12 + (today.month - date_of_birth.month)
        if today.day < date_of_birth.day:
            months -= 1
        
        return {
            "years": 0,
            "months": months,
            "display": f"{months} meses" if months != 1 else "1 mes"
        }
    
    return {
        "years": years,
        "months": None,
        "display": f"{years} años" if years != 1 else "1 año"
    }


async def get_patient_info_summary(
    patient_profile: PatientProfile,
    user: User
) -> sharing_schema.PatientInfoSummary:
    """Get patient demographic information."""
    age_info = calculate_age(patient_profile.date_of_birth)
    
    # Build full name
    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    if not full_name:
        full_name = user.email
    
    return sharing_schema.PatientInfoSummary(
        full_name=full_name,
        date_of_birth=patient_profile.date_of_birth,
        age_years=age_info["years"],
        age_months=age_info["months"],
        age_display=age_info["display"],
        sex=user.sex.value if user.sex else None
    )


async def get_active_medications(
    patient_id: UUID,
    db: AsyncSession
) -> List[sharing_schema.MedicationSummary]:
    """Get active medications for a patient."""
    stmt = select(Medication).filter(
        and_(
            Medication.patient_profile_id == patient_id,
            Medication.status == MedicationStatus.ACTIVE
        )
    ).order_by(Medication.start_date.desc())
    
    result = await db.execute(stmt)
    medications = result.scalars().all()
    
    return [
        sharing_schema.MedicationSummary(
            id=str(med.id),
            name=med.name,
            dosage=med.dosage,
            frequency=med.frequency,
            start_date=datetime.combine(med.start_date, datetime.min.time()) if med.start_date else None
        )
        for med in medications
    ]


async def get_active_conditions(
    patient_id: UUID,
    db: AsyncSession
) -> List[sharing_schema.ConditionSummary]:
    """Get active conditions for a patient."""
    stmt = select(Condition).filter(
        and_(
            Condition.patient_profile_id == patient_id,
            Condition.status.in_([ConditionStatus.ACTIVE, ConditionStatus.CONTROLLED]),
            Condition.deleted == False
        )
    ).order_by(Condition.created_at.desc())
    
    result = await db.execute(stmt)
    conditions = result.scalars().all()
    
    return [
        sharing_schema.ConditionSummary(
            id=str(cond.id),
            name=cond.name,
            diagnosed_date=cond.created_at,
            severity=cond.status.value
        )
        for cond in conditions
    ]


async def get_active_allergies(
    patient_id: UUID,
    db: AsyncSession
) -> List[sharing_schema.AllergySummary]:
    """Get active allergies for a patient."""
    stmt = select(Allergy).filter(
        and_(
            Allergy.patient_profile_id == patient_id,
            Allergy.deleted == False
        )
    ).order_by(Allergy.created_at.desc())
    
    result = await db.execute(stmt)
    allergies = result.scalars().all()
    
    return [
        sharing_schema.AllergySummary(
            id=str(allergy.id),
            allergen=allergy.allergen,
            reaction=allergy.reaction,
            severity=allergy.severity.value if allergy.severity else None
        )
        for allergy in allergies
    ]


async def get_recent_records(
    patient_id: UUID,
    db: AsyncSession,
    limit: int = 7
) -> List[sharing_schema.RecentRecordSummary]:
    """Get most recent medical records for a patient."""
    stmt = select(MedicalRecord).filter(
        MedicalRecord.patient_id == patient_id
    ).options(
        selectinload(MedicalRecord.documents),
        selectinload(MedicalRecord.category),
        selectinload(MedicalRecord.diagnoses)
    ).order_by(
        desc(MedicalRecord.created_at)
    ).limit(limit)
    
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    return [
        sharing_schema.RecentRecordSummary(
            id=str(record.id),
            motive=record.motive,
            diagnosis=", ".join([d.diagnosis for d in record.diagnoses]) if record.diagnoses and len(record.diagnoses) > 0 else None,
            category={
                "id": str(record.category.id),
                "name": record.category.name
            } if record.category else None,
            created_at=record.created_at,
            has_documents=len(record.documents) > 0 if record.documents else False
        )
        for record in records
    ]


async def build_medical_history_summary(
    patient_profile: PatientProfile,
    user: User,
    db: AsyncSession
) -> dict:
    """
    Build complete medical history summary.
    Aggregates all components needed for the summary view.
    """
    patient_info = await get_patient_info_summary(patient_profile, user)
    medications = await get_active_medications(patient_profile.id, db)
    conditions = await get_active_conditions(patient_profile.id, db)
    allergies = await get_active_allergies(patient_profile.id, db)
    recent_records = await get_recent_records(patient_profile.id, db)
    
    return {
        "patient_info": patient_info,
        "active_medications": medications,
        "conditions": conditions,
        "allergies": allergies,
        "recent_records": recent_records
    }
