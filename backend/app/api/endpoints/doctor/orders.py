"""Clinical order management on medical records."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.api.deps import get_db
from app.models.user import User
from app.models.hx import MedicalRecord
from app.models.clinical import ClinicalOrder
from app.schemas import clinical as clinical_schema

from ._helpers import require_doctor_role, get_doctor_patient_access

router = APIRouter()


@router.post("/records/{record_id}/orders", response_model=clinical_schema.ClinicalOrderResponse)
async def add_clinical_order(
    record_id: uuid.UUID,
    order_in: clinical_schema.ClinicalOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Add a clinical order to a medical record."""
    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id)
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    await get_doctor_patient_access(record.patient_id, db, current_user, require_write=True)

    order = ClinicalOrder(
        medical_record_id=record_id,
        created_by=current_user.id,
        order_type=order_in.order_type,
        description=order_in.description,
        urgency=order_in.urgency,
        reason=order_in.reason,
        notes=order_in.notes,
        referral_to=order_in.referral_to,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    return order


@router.delete("/records/{record_id}/orders/{order_id}")
async def delete_clinical_order(
    record_id: uuid.UUID,
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Delete a clinical order from a medical record."""
    result = await db.execute(
        select(ClinicalOrder).where(
            and_(
                ClinicalOrder.id == order_id,
                ClinicalOrder.medical_record_id == record_id,
            )
        )
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id)
    )
    record = result.scalar_one()
    await get_doctor_patient_access(record.patient_id, db, current_user, require_write=True)

    await db.delete(order)
    await db.commit()

    return {"message": "Order deleted"}
