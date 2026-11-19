"""Regression coverage for paginated doctor clinical collections."""

import unittest
from datetime import date, datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi import Response
from sqlalchemy.dialects import postgresql

from app.db import base as _models  # noqa: F401 - register all ORM relationships
from app.api.endpoints.doctor import orders, prescriptions, records, vital_signs
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


def compiled_sql(statement) -> str:
    return str(
        statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    ).lower()


class DoctorRecordPaginationTests(unittest.IsolatedAsyncioTestCase):
    async def test_record_page_has_total_stable_order_and_document_counts(self):
        record = records.MedicalRecord(
            id=uuid4(),
            patient_id=uuid4(),
            motive="Control",
            record_date=date(2026, 11, 18),
            created_by=uuid4(),
        )
        db = SimpleNamespace(
            execute=AsyncMock(
                side_effect=(
                    FakeResult(scalar=19),
                    FakeResult(rows=[record]),
                    FakeResult(rows=[(record.id, 4)]),
                )
            )
        )
        response = Response()

        with patch.object(records, "get_doctor_patient_access", new=AsyncMock()):
            result = await records.list_patient_records(
                patient_profile_id=uuid4(),
                response=response,
                pagination=PaginationParams(skip=7, limit=7),
                db=db,
                current_user=SimpleNamespace(id=uuid4()),
                category_id=None,
                include_documents=False,
            )

        self.assertEqual(result, [record])
        self.assertEqual(record.document_count, 4)
        self.assertEqual(response.headers["X-Total-Count"], "19")
        self.assertEqual(response.headers["X-Page"], "2")

        page_sql = compiled_sql(db.execute.await_args_list[1].args[0])
        self.assertIn("limit 7", page_sql)
        self.assertIn("offset 7", page_sql)
        self.assertIn(
            "order by medical_records.record_date desc, "
            "medical_records.created_at desc, medical_records.id desc",
            page_sql,
        )

    async def test_document_list_is_lightweight_and_paginated(self):
        document_id = uuid4()
        record_id = uuid4()
        document = SimpleNamespace(
            id=document_id,
            medical_record_id=record_id,
            filename="resultado.pdf",
            s3_key="documents/result.pdf",
            media_type="application/pdf",
            tags=["laboratorio"],
            created_at=datetime.now(timezone.utc),
        )
        db = SimpleNamespace(
            execute=AsyncMock(
                side_effect=(
                    FakeResult(scalar=12),
                    FakeResult(rows=[(document, "Control", date(2026, 11, 18), "Laboratorio")]),
                )
            )
        )
        response = Response()

        with (
            patch.object(records, "get_doctor_patient_access", new=AsyncMock()),
            patch.object(records, "get_presigned_url", return_value="/signed/result.pdf"),
        ):
            result = await records.list_patient_documents(
                patient_profile_id=uuid4(),
                response=response,
                pagination=PaginationParams(skip=10, limit=10),
                db=db,
                current_user=SimpleNamespace(id=uuid4()),
                category_id=None,
            )

        self.assertEqual(result[0].id, document_id)
        self.assertEqual(result[0].url, "/signed/result.pdf")
        self.assertFalse(hasattr(result[0], "s3_key"))
        self.assertFalse(hasattr(result[0], "ocr_text"))
        self.assertEqual(response.headers["X-Total-Pages"], "2")


class DoctorPlanPaginationTests(unittest.IsolatedAsyncioTestCase):
    async def test_prescriptions_are_paged_across_all_patient_records(self):
        db = SimpleNamespace(
            execute=AsyncMock(
                side_effect=(FakeResult(scalar=8), FakeResult(rows=[]))
            )
        )
        response = Response()

        with patch.object(prescriptions, "get_doctor_patient_access", new=AsyncMock()):
            result = await prescriptions.list_patient_prescriptions(
                patient_profile_id=uuid4(),
                response=response,
                pagination=PaginationParams(skip=3, limit=3),
                db=db,
                current_user=SimpleNamespace(id=uuid4()),
            )

        self.assertEqual(result, [])
        self.assertEqual(response.headers["X-Total-Count"], "8")
        page_sql = compiled_sql(db.execute.await_args_list[1].args[0])
        self.assertIn("join medical_records", page_sql)
        self.assertIn("limit 3", page_sql)
        self.assertIn("offset 3", page_sql)

    async def test_orders_and_vital_signs_emit_pagination_headers(self):
        for module, endpoint in (
            (orders, orders.list_patient_orders),
            (vital_signs, vital_signs.list_patient_vital_signs),
        ):
            with self.subTest(module=module.__name__):
                db = SimpleNamespace(
                    execute=AsyncMock(
                        side_effect=(FakeResult(scalar=14), FakeResult(rows=[]))
                    )
                )
                response = Response()
                kwargs = {
                    "patient_profile_id": uuid4(),
                    "response": response,
                    "pagination": PaginationParams(skip=10, limit=10),
                    "db": db,
                    "current_user": SimpleNamespace(id=uuid4()),
                }
                if module is orders:
                    kwargs["order_type"] = None

                with patch.object(module, "get_doctor_patient_access", new=AsyncMock()):
                    result = await endpoint(**kwargs)

                self.assertEqual(result, [])
                self.assertEqual(response.headers["X-Page"], "2")
                self.assertEqual(response.headers["X-Total-Pages"], "2")


if __name__ == "__main__":
    unittest.main()
