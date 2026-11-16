"""Handler checks for the public assistant invitation flow."""

import asyncio
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

from fastapi import HTTPException, Request

from app.api.endpoints.auth import (
    activate_assistant,
    preview_assistant_invitation,
    rate_limiter,
)
from app.db.base import Base
import app.models.patient_location  # noqa: F401 - register relationship target for mapper setup
from app.models.assistant import DoctorAssistantAssignment
from app.models.user import User, UserRole
from app.schemas.assistant import AssistantActivateRequest, AssistantInvitationPreviewRequest


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalars(self):
        return self

    def first(self):
        return self.value


class FakeSession:
    def __init__(self, *results):
        self.results = iter(results)
        self.added = []
        self.commits = 0

    async def execute(self, _query):
        return FakeResult(next(self.results))

    def add(self, value):
        self.added.append(value)

    async def flush(self):
        for value in self.added:
            if hasattr(value, "id") and value.id is None:
                value.id = uuid4()

    async def commit(self):
        self.commits += 1


def invitation(**changes):
    values = {
        "token": "test-invitation-token",
        "doctor_id": uuid4(),
        "health_center_id": uuid4(),
        "email": "assistant@example.com",
        "first_name": "Ana",
        "last_name": "López",
        "permissions": ["RECORDS_READ"],
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
        "claimed_at": None,
        "is_revoked": False,
    }
    values.update(changes)
    return SimpleNamespace(**values)


class AssistantActivationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.registry.configure()

    def setUp(self):
        rate_limiter._requests.clear()

    def preview(self, session):
        request = Request({"type": "http", "headers": [], "client": ("127.0.0.1", 1234)})
        return asyncio.run(
            preview_assistant_invitation(
                AssistantInvitationPreviewRequest(token="test-invitation-token"),
                request,
                session,
            )
        )

    def activate(self, session, password=None):
        return asyncio.run(
            activate_assistant(
                AssistantActivateRequest(token="test-invitation-token", password=password),
                session,
            )
        )

    def test_preview_selects_new_existing_and_conflict_flows(self):
        for account, expected in (
            (None, "new"),
            (SimpleNamespace(role=UserRole.ASSISTANT), "existing_assistant"),
            (SimpleNamespace(role=UserRole.PATIENT), "conflict"),
        ):
            with self.subTest(expected=expected):
                session = FakeSession(
                    invitation(),
                    SimpleNamespace(first_name="Luis", last_name="García"),
                    SimpleNamespace(name="Clínica Central"),
                    account,
                )
                response = self.preview(session)
                self.assertEqual(response.account_status, expected)
                self.assertEqual(response.doctor_name, "Luis García")
                self.assertEqual(response.health_center_name, "Clínica Central")

    def test_preview_rejects_invalid_revoked_used_and_expired_links(self):
        cases = (
            (None, 404),
            (invitation(is_revoked=True), 400),
            (invitation(claimed_at=datetime.now(timezone.utc)), 400),
            (invitation(expires_at=datetime.now(timezone.utc) - timedelta(seconds=1)), 400),
        )
        for value, expected_status in cases:
            with self.subTest(value=value):
                with self.assertRaises(HTTPException) as error:
                    self.preview(FakeSession(value))
                self.assertEqual(error.exception.status_code, expected_status)

    def test_existing_assistant_accepts_without_password(self):
        invite = invitation()
        session = FakeSession(invite, SimpleNamespace(id=uuid4(), role=UserRole.ASSISTANT))
        response = self.activate(session)

        self.assertIn("Asignación creada", response["message"])
        self.assertEqual(session.commits, 1)
        self.assertIsNotNone(invite.claimed_at)
        self.assertIsInstance(session.added[0], DoctorAssistantAssignment)

    def test_new_assistant_requires_password(self):
        session = FakeSession(invitation(), None)
        with self.assertRaises(HTTPException) as error:
            self.activate(session)
        self.assertEqual(error.exception.status_code, 400)
        self.assertEqual(session.commits, 0)

    def test_new_assistant_creates_account_and_assignment(self):
        invite = invitation()
        session = FakeSession(invite, None)
        response = self.activate(session, password="password123")

        self.assertEqual(response["email"], invite.email)
        self.assertEqual(session.commits, 1)
        self.assertIsNotNone(invite.claimed_at)
        self.assertIsInstance(session.added[0], User)
        self.assertNotEqual(session.added[0].password, "password123")
        self.assertEqual(len(session.added), 4)


if __name__ == "__main__":
    unittest.main()
