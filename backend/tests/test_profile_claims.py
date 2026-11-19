"""Regression coverage for doctor-approved patient profile claims."""

import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from app.db import base  # noqa: F401 - register all ORM relationship targets
from app.api.endpoints.doctor import claims
from app.models.family import AccessLevel, FamilyMembership, RelationshipType
from app.models.profile_claim import ClaimStatus
from app.models.user import AccessType, DoctorAccessLevel
from app.services import profile_claims


class ScalarResult:
    def __init__(self, rows):
        self.rows = rows

    def scalars(self):
        return self

    def all(self):
        return self.rows

    def first(self):
        return self.rows[0] if self.rows else None


def empty_profile(profile_id=None):
    values = {
        field: None
        for field in profile_claims._PERSONAL_DATA_FIELDS
    }
    values["id"] = profile_id or uuid4()
    return SimpleNamespace(**values)


class OperationalReferenceSession:
    def __init__(self, old_accesses, target_accesses):
        self.results = iter((ScalarResult(old_accesses), ScalarResult(target_accesses)))
        self.statements = []
        self.deleted = []

    async def execute(self, statement):
        self.statements.append(statement)
        if len(self.statements) <= 2:
            return next(self.results)
        return None

    async def delete(self, value):
        self.deleted.append(value)


class ClaimSession:
    def __init__(self, claim, claimed_profile, membership, old_profile):
        self.results = iter(
            (
                SimpleNamespace(first=lambda: (claim, claimed_profile)),
                ScalarResult([membership]),
            )
        )
        self.old_profile = old_profile
        self.added = []
        self.deleted = []
        self.flushes = 0
        self.commits = 0

    async def execute(self, _statement):
        return next(self.results)

    async def get(self, _model, _profile_id, **_kwargs):
        return self.old_profile

    def add(self, value):
        self.added.append(value)

    async def delete(self, value):
        self.deleted.append(value)

    async def flush(self):
        self.flushes += 1

    async def commit(self):
        self.commits += 1


class ProfileClaimServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_profile_data_check_includes_demographics_and_all_content_tables(self):
        profile = empty_profile()
        db = SimpleNamespace(scalar=AsyncMock(return_value=False))

        self.assertFalse(
            await profile_claims.profile_has_preservable_data(db, profile, uuid4())
        )
        query = db.scalar.await_args.args[0]
        sql = str(query)
        for table in (
            "medical_records",
            "vital_signs",
            "clinical_orders",
            "medications",
            "surgeries",
            "vaccines",
            "allergies",
            "conditions",
            "personal_references",
            "health_habits",
            "family_history_conditions",
            "patient_locations",
            "family_memberships",
            "profile_claim_requests",
        ):
            self.assertIn(table, sql)

        db.scalar.reset_mock()
        profile.phone = "9999-9999"
        self.assertTrue(
            await profile_claims.profile_has_preservable_data(db, profile, uuid4())
        )
        db.scalar.assert_not_awaited()

    async def test_operational_references_are_moved_and_duplicate_access_is_merged(self):
        old_profile_id = uuid4()
        claimed_profile_id = uuid4()
        shared_doctor_id = uuid4()
        target_access = SimpleNamespace(
            doctor_id=shared_doctor_id,
            health_center_id=None,
            access_level=DoctorAccessLevel.READ_ONLY,
            access_type=AccessType.TEMPORARY,
            patient_profile_id=claimed_profile_id,
        )
        duplicate_access = SimpleNamespace(
            doctor_id=shared_doctor_id,
            health_center_id=None,
            access_level=DoctorAccessLevel.WRITE,
            access_type=AccessType.PERMANENT,
            patient_profile_id=old_profile_id,
        )
        distinct_access = SimpleNamespace(
            doctor_id=uuid4(),
            health_center_id=uuid4(),
            access_level=DoctorAccessLevel.READ_ONLY,
            access_type=AccessType.TEMPORARY,
            patient_profile_id=old_profile_id,
        )
        db = OperationalReferenceSession(
            [duplicate_access, distinct_access],
            [target_access],
        )

        await profile_claims.move_operational_references(
            db,
            old_profile_id,
            claimed_profile_id,
        )

        self.assertEqual(target_access.access_level, DoctorAccessLevel.WRITE)
        self.assertEqual(target_access.access_type, AccessType.PERMANENT)
        self.assertEqual(db.deleted, [duplicate_access])
        self.assertEqual(distinct_access.patient_profile_id, claimed_profile_id)

        updates = db.statements[2:]
        self.assertEqual(
            [statement.table.name for statement in updates],
            ["access_invitations", "family_invitations", "share_tokens"],
        )
        for statement in updates:
            params = statement.compile().params.values()
            self.assertIn(old_profile_id, params)
            self.assertIn(claimed_profile_id, params)


class ProfileClaimEndpointTests(unittest.IsolatedAsyncioTestCase):
    def claim_objects(self):
        user_id = uuid4()
        claim = SimpleNamespace(
            id=uuid4(),
            user_id=user_id,
            status=ClaimStatus.PENDING,
            resolved_at=None,
            resolved_by=None,
        )
        claimed_profile = SimpleNamespace(id=uuid4(), user_id=None)
        membership = SimpleNamespace(
            id=uuid4(),
            user_id=user_id,
            patient_profile_id=uuid4(),
            relationship_type=RelationshipType.SELF,
            access_level=AccessLevel.FULL_ACCESS,
            is_active=True,
        )
        return claim, claimed_profile, membership, empty_profile(membership.patient_profile_id)

    async def test_empty_self_profile_moves_references_before_deletion(self):
        claim, claimed_profile, membership, old_profile = self.claim_objects()
        db = ClaimSession(claim, claimed_profile, membership, old_profile)
        move_references = AsyncMock()

        with (
            patch.object(
                claims,
                "profile_has_preservable_data",
                new=AsyncMock(return_value=False),
            ),
            patch.object(
                claims,
                "move_operational_references",
                new=move_references,
            ),
        ):
            response = await claims.approve_claim_request(
                str(claim.id),
                db,
                SimpleNamespace(id=uuid4()),
            )

        self.assertIn("aprobada", response["message"])
        move_references.assert_awaited_once_with(
            db,
            old_profile.id,
            claimed_profile.id,
        )
        self.assertEqual(membership.patient_profile_id, claimed_profile.id)
        self.assertEqual(claimed_profile.user_id, claim.user_id)
        self.assertEqual(db.flushes, 1)
        self.assertEqual(db.deleted, [old_profile])
        self.assertEqual(db.commits, 1)
        self.assertEqual(claim.status, ClaimStatus.APPROVED)

    async def test_self_profile_with_data_is_preserved_as_additional_profile(self):
        claim, claimed_profile, membership, old_profile = self.claim_objects()
        db = ClaimSession(claim, claimed_profile, membership, old_profile)
        move_references = AsyncMock()

        with (
            patch.object(
                claims,
                "profile_has_preservable_data",
                new=AsyncMock(return_value=True),
            ),
            patch.object(
                claims,
                "move_operational_references",
                new=move_references,
            ),
        ):
            await claims.approve_claim_request(
                str(claim.id),
                db,
                SimpleNamespace(id=uuid4()),
            )

        move_references.assert_not_awaited()
        self.assertEqual(membership.patient_profile_id, old_profile.id)
        self.assertEqual(db.deleted, [])
        self.assertEqual(len(db.added), 1)
        self.assertIsInstance(db.added[0], FamilyMembership)
        self.assertEqual(db.added[0].patient_profile_id, claimed_profile.id)
        self.assertEqual(db.commits, 1)


if __name__ == "__main__":
    unittest.main()
