"""Clinical order management — both record-attached and standalone."""
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_

from app.api.deps import get_db
from app.models.user import User
from app.models.hx import MedicalRecord, Category
from app.models.clinical import ClinicalOrder
from app.schemas import clinical as clinical_schema

from ._helpers import require_doctor_role, get_doctor_patient_access

router = APIRouter()


# ─── Record-attached orders ──────────────────────────────────────────────────


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

    items_data = [item.model_dump() for item in (order_in.items or [])]

    order = ClinicalOrder(
        medical_record_id=record_id,
        created_by=current_user.id,
        order_type=order_in.order_type,
        description=order_in.description,
        items=items_data if items_data else None,
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


# ─── Standalone orders ────────────────────────────────────────────────────────


@router.post(
    "/patients/{patient_profile_id}/orders",
    response_model=clinical_schema.ClinicalOrderResponse,
)
async def create_standalone_order(
    patient_profile_id: uuid.UUID,
    order_in: clinical_schema.StandaloneClinicalOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Create a standalone clinical order for a patient (not attached to a record)."""
    await get_doctor_patient_access(patient_profile_id, db, current_user, require_write=True)

    # Look up the "Orden" category
    result = await db.execute(
        select(Category).where(Category.name == "Orden")
    )
    orden_category = result.scalar_one_or_none()

    items_data = [item.model_dump() for item in order_in.items]

    order = ClinicalOrder(
        patient_id=patient_profile_id,
        category_id=orden_category.id if orden_category else None,
        created_by=current_user.id,
        order_type=order_in.order_type,
        description=order_in.description,
        items=items_data,
        urgency=order_in.urgency,
        reason=order_in.reason,
        notes=order_in.notes,
        referral_to=order_in.referral_to,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    return order


@router.get(
    "/patients/{patient_profile_id}/orders",
    response_model=List[clinical_schema.ClinicalOrderResponse],
)
async def list_patient_orders(
    patient_profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
    order_type: Optional[str] = Query(None, description="Filter by order type (LAB, IMAGING, REFERRAL, PROCEDURE)"),
):
    """List all orders for a patient — both standalone and record-attached."""
    await get_doctor_patient_access(patient_profile_id, db, current_user)

    query = select(ClinicalOrder).where(
        or_(
            # Standalone orders linked directly to patient
            ClinicalOrder.patient_id == patient_profile_id,
            # Record-attached orders (via medical_record.patient_id)
            ClinicalOrder.medical_record_id.in_(
                select(MedicalRecord.id).where(
                    MedicalRecord.patient_id == patient_profile_id
                )
            ),
        )
    ).order_by(ClinicalOrder.created_at.desc())

    if order_type:
        query = query.where(ClinicalOrder.order_type == order_type)

    result = await db.execute(query)
    orders = result.scalars().all()

    return orders


@router.delete("/patients/{patient_profile_id}/orders/{order_id}")
async def delete_standalone_order(
    patient_profile_id: uuid.UUID,
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor_role),
):
    """Delete a standalone clinical order."""
    await get_doctor_patient_access(patient_profile_id, db, current_user, require_write=True)

    result = await db.execute(
        select(ClinicalOrder).where(
            and_(
                ClinicalOrder.id == order_id,
                ClinicalOrder.patient_id == patient_profile_id,
                ClinicalOrder.medical_record_id.is_(None),  # Only standalone
            )
        )
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Standalone order not found")

    await db.delete(order)
    await db.commit()

    return {"message": "Order deleted"}
