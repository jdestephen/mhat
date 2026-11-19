"""Regression coverage for the first server-paginated list endpoints."""

import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi import Response
from sqlalchemy.dialects import postgresql

from app.api.endpoints import hx
from app.api.endpoints.doctor import patients
from app.api.pagination import PaginationParams


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


class PaginatedMedicalRecordsTests(unittest.IsolatedAsyncioTestCase):
    async def test_filters_count_and_page_with_stable_order(self):
        db = SimpleNamespace(
            execute=AsyncMock(
                side_effect=(
                    FakeResult(scalar=23),
                    FakeResult(rows=[]),
                )
            )
        )
        response = Response()

        with patch.object(
            hx,
            "resolve_patient_profile",
            new=AsyncMock(return_value=SimpleNamespace(id=uuid4())),
        ):
            records = await hx.read_medical_records(
                response=response,
                pagination=PaginationParams(skip=10, limit=10),
                db=db,
                current_user=SimpleNamespace(id=uuid4()),
                q="Dolor",
                category_id=None,
                date_from=None,
                date_to=None,
                profile_id=None,
                has_prescriptions=None,
                has_orders=None,
            )

        self.assertEqual(records, [])
        self.assertEqual(response.headers["X-Total-Count"], "23")
        self.assertEqual(response.headers["X-Page"], "2")
        self.assertEqual(response.headers["X-Total-Pages"], "3")

        count_sql = str(
            db.execute.await_args_list[0].args[0].compile(
                dialect=postgresql.dialect(),
                compile_kwargs={"literal_binds": True},
            )
        ).lower()
        page_sql = str(
            db.execute.await_args_list[1].args[0].compile(
                dialect=postgresql.dialect(),
                compile_kwargs={"literal_binds": True},
            )
        ).lower()

        self.assertIn("dolor", count_sql)
        self.assertNotIn("limit", count_sql)
        self.assertIn("limit 10", page_sql)
        self.assertIn("offset 10", page_sql)
        self.assertIn(
            "order by medical_records.record_date desc, "
            "medical_records.created_at desc, medical_records.id desc",
            page_sql,
        )


class PaginatedDoctorPatientsTests(unittest.IsolatedAsyncioTestCase):
    async def test_search_count_and_recent_order_are_server_side(self):
        db = SimpleNamespace(
            execute=AsyncMock(
                side_effect=(
                    FakeResult(scalar=41),
                    FakeResult(rows=[]),
                )
            )
        )
        response = Response()

        result = await patients.list_my_patients(
            response=response,
            pagination=PaginationParams(skip=20, limit=20),
            q="Ana",
            sort=patients.PatientSort.RECENT,
            db=db,
            current_user=SimpleNamespace(id=uuid4()),
        )

        self.assertEqual(result, [])
        self.assertEqual(response.headers["X-Total-Count"], "41")
        self.assertEqual(response.headers["X-Page"], "2")
        self.assertEqual(response.headers["X-Total-Pages"], "3")

        count_sql = str(
            db.execute.await_args_list[0].args[0].compile(
                dialect=postgresql.dialect(),
                compile_kwargs={"literal_binds": True},
            )
        ).lower()
        page_sql = str(
            db.execute.await_args_list[1].args[0].compile(
                dialect=postgresql.dialect(),
                compile_kwargs={"literal_binds": True},
            )
        ).lower()

        self.assertIn("%ana%", count_sql)
        self.assertNotIn("limit", count_sql)
        self.assertIn("limit 20", page_sql)
        self.assertIn("offset 20", page_sql)
        self.assertIn("doctor_patient_access.created_at desc", page_sql)
        self.assertIn("doctor_patient_access.id desc", page_sql)


if __name__ == "__main__":
    unittest.main()
