"""Regression coverage for paginated operational lists."""

import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi import Response
from sqlalchemy.dialects import postgresql

from app.db import base as _models  # noqa: F401 - register all ORM relationships
from app.api.endpoints import admin, assistants, sharing
from app.api.pagination import PaginationParams
from app.models.doctor import DoctorApprovalStatus


class FakeResult:
    def __init__(self, *, scalar=None, rows=None):
        self.scalar = scalar
        self.rows = rows or []

    def scalar_one(self):
        return self.scalar

    def scalars(self):
        return self

    def all(self):
        return self.rows


def compiled_sql(statement) -> str:
    return str(
        statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    ).lower()


class AdminPaginationTests(unittest.IsolatedAsyncioTestCase):
    async def test_doctor_applications_search_filter_count_and_page(self):
        db = SimpleNamespace(
            execute=AsyncMock(
                side_effect=(FakeResult(scalar=27), FakeResult(rows=[]))
            )
        )
        response = Response()

        result = await admin.list_doctor_applications(
            response=response,
            pagination=PaginationParams(skip=20, limit=20),
            status=DoctorApprovalStatus.PENDING,
            q="Ana",
            db=db,
            current_user=SimpleNamespace(id=uuid4()),
        )

        self.assertEqual(result, [])
        self.assertEqual(response.headers["X-Total-Count"], "27")
        self.assertEqual(response.headers["X-Page"], "2")
        count_sql = compiled_sql(db.execute.await_args_list[0].args[0])
        page_sql = compiled_sql(db.execute.await_args_list[1].args[0])
        self.assertIn("%ana%", count_sql)
        self.assertIn("pending", count_sql)
        self.assertIn("limit 20", page_sql)
        self.assertIn("offset 20", page_sql)
        self.assertIn("doctor_profiles.id desc", page_sql)


class AssistantPaginationTests(unittest.IsolatedAsyncioTestCase):
    async def test_assistant_assignments_are_filtered_and_paginated(self):
        db = SimpleNamespace(
            execute=AsyncMock(
                side_effect=(FakeResult(scalar=12), FakeResult(rows=[]))
            )
        )
        response = Response()

        result = await assistants.list_assistants(
            response=response,
            pagination=PaginationParams(skip=5, limit=5),
            q="Centro",
            is_active=True,
            db=db,
            current_user=SimpleNamespace(id=uuid4()),
        )

        self.assertEqual(result, [])
        self.assertEqual(response.headers["X-Total-Pages"], "3")
        count_sql = compiled_sql(db.execute.await_args_list[0].args[0])
        page_sql = compiled_sql(db.execute.await_args_list[1].args[0])
        self.assertIn("is_active = true", count_sql)
        self.assertIn("%centro%", count_sql)
        self.assertIn("limit 5", page_sql)
        self.assertIn("offset 5", page_sql)

    async def test_assistant_invitations_have_stable_order(self):
        db = SimpleNamespace(
            execute=AsyncMock(
                side_effect=(FakeResult(scalar=4), FakeResult(rows=[]))
            )
        )
        response = Response()

        result = await assistants.list_invitations(
            response=response,
            pagination=PaginationParams(skip=0, limit=10),
            q=None,
            db=db,
            current_user=SimpleNamespace(id=uuid4()),
        )

        self.assertEqual(result, [])
        self.assertEqual(response.headers["X-Total-Count"], "4")
        page_sql = compiled_sql(db.execute.await_args_list[1].args[0])
        self.assertIn(
            "order by assistant_invitations.created_at desc, "
            "assistant_invitations.id desc",
            page_sql,
        )


class SharedLinksPaginationTests(unittest.IsolatedAsyncioTestCase):
    async def test_expired_filter_is_exclusive_and_paginated(self):
        db = SimpleNamespace(
            execute=AsyncMock(
                side_effect=(FakeResult(scalar=6), FakeResult(rows=[]))
            )
        )
        response = Response()

        with patch.object(
            sharing.deps,
            "resolve_patient_profile",
            new=AsyncMock(return_value=SimpleNamespace(id=uuid4())),
        ):
            result = await sharing.list_my_shares(
                response=response,
                pagination=PaginationParams(skip=5, limit=5),
                db=db,
                current_user=SimpleNamespace(id=uuid4()),
                include_expired=False,
                include_revoked=False,
                share_status="expired",
                profile_id=None,
            )

        self.assertEqual(result.shares, [])
        self.assertEqual(response.headers["X-Page"], "2")
        count_sql = compiled_sql(db.execute.await_args_list[0].args[0])
        page_sql = compiled_sql(db.execute.await_args_list[1].args[0])
        self.assertIn("share_tokens.expires_at <", count_sql)
        self.assertIn("share_tokens.is_revoked is false", count_sql)
        self.assertIn("limit 5", page_sql)
        self.assertIn("offset 5", page_sql)


if __name__ == "__main__":
    unittest.main()
