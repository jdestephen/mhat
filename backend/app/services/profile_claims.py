"""Helpers for safely merging a newly registered SELF profile into a claimed profile."""

from uuid import UUID

from sqlalchemy import exists, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.access_invitation import AccessInvitation
from app.models.clinical import ClinicalOrder
from app.models.family import FamilyMembership
from app.models.family_invitation import FamilyInvitation
from app.models.hx import MedicalRecord, VitalSigns
from app.models.patient import (
    Allergy,
    Condition,
    FamilyHistoryCondition,
    HealthHabit,
    Medication,
    PatientProfile,
    PersonalReference,
    Surgery,
    Vaccine,
)
from app.models.patient_location import PatientLocation
from app.models.profile_claim import ProfileClaimRequest
from app.models.sharing import ShareToken
from app.models.user import (
    AccessType,
    DoctorAccessLevel,
    DoctorPatientAccess,
)


# first_name and last_name are populated during registration and can safely be
# replaced by the doctor-created profile. The remaining fields indicate that
# the patient has already completed or edited their SELF profile.
_PERSONAL_DATA_FIELDS = (
    "date_of_birth",
    "blood_type",
    "dni",
    "phone",
    "address",
    "sex",
    "city",
    "country",
    "email",
)

_PROFILE_CONTENT_COLUMNS = (
    MedicalRecord.patient_id,
    VitalSigns.patient_id,
    ClinicalOrder.patient_id,
    Medication.patient_profile_id,
    Surgery.patient_profile_id,
    Vaccine.patient_profile_id,
    Allergy.patient_profile_id,
    Condition.patient_profile_id,
    PersonalReference.patient_profile_id,
    HealthHabit.patient_profile_id,
    FamilyHistoryCondition.patient_profile_id,
    PatientLocation.patient_profile_id,
)

_OPERATIONAL_REFERENCE_COLUMNS = (
    AccessInvitation.patient_profile_id,
    FamilyInvitation.patient_profile_id,
    ShareToken.patient_id,
)


async def profile_has_preservable_data(
    db: AsyncSession,
    profile: PatientProfile,
    self_membership_id: UUID,
) -> bool:
    """Return whether replacing ``profile`` could discard patient-owned data.

    Operational references such as access invitations are intentionally not
    considered content: they are moved to the claimed profile by
    ``move_operational_references``. Other memberships and claim requests are
    kept on their existing profile rather than reassigned implicitly.
    """

    if any(getattr(profile, field) is not None for field in _PERSONAL_DATA_FIELDS):
        return True

    content_checks = [
        exists().where(column == profile.id)
        for column in _PROFILE_CONTENT_COLUMNS
    ]
    content_checks.extend(
        (
            exists().where(
                FamilyMembership.patient_profile_id == profile.id,
                FamilyMembership.id != self_membership_id,
            ),
            exists().where(ProfileClaimRequest.patient_profile_id == profile.id),
        )
    )

    return bool(await db.scalar(select(or_(*content_checks))))


def _merge_access_settings(
    target: DoctorPatientAccess,
    source: DoctorPatientAccess,
) -> None:
    """Preserve the strongest access when both profiles grant the same access."""

    if source.access_level == DoctorAccessLevel.WRITE:
        target.access_level = DoctorAccessLevel.WRITE
    if source.access_type == AccessType.PERMANENT:
        target.access_type = AccessType.PERMANENT


async def _move_doctor_access(
    db: AsyncSession,
    old_profile_id: UUID,
    claimed_profile_id: UUID,
) -> None:
    old_result = await db.execute(
        select(DoctorPatientAccess)
        .where(DoctorPatientAccess.patient_profile_id == old_profile_id)
        .with_for_update()
    )
    target_result = await db.execute(
        select(DoctorPatientAccess)
        .where(DoctorPatientAccess.patient_profile_id == claimed_profile_id)
        .with_for_update()
    )

    target_by_scope = {
        (access.doctor_id, access.health_center_id): access
        for access in target_result.scalars().all()
    }

    for access in old_result.scalars().all():
        scope = (access.doctor_id, access.health_center_id)
        existing = target_by_scope.get(scope)
        if existing:
            _merge_access_settings(existing, access)
            await db.delete(access)
            continue

        access.patient_profile_id = claimed_profile_id
        target_by_scope[scope] = access


async def move_operational_references(
    db: AsyncSession,
    old_profile_id: UUID,
    claimed_profile_id: UUID,
) -> None:
    """Move non-clinical references before deleting an empty SELF profile."""

    await _move_doctor_access(db, old_profile_id, claimed_profile_id)

    for column in _OPERATIONAL_REFERENCE_COLUMNS:
        await db.execute(
            update(column.class_)
            .where(column == old_profile_id)
            .values({column.key: claimed_profile_id})
            .execution_options(synchronize_session=False)
        )
