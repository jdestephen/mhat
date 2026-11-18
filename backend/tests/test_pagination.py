"""Unit coverage for the shared API pagination primitives."""

import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi import FastAPI, Response
from sqlalchemy import column, select, table

from app.api.pagination import (
    build_pagination_metadata,
    count_rows,
    PaginationDep,
    set_pagination_headers,
)


class PaginationMetadataTests(unittest.TestCase):
    def test_dependency_exposes_validated_query_parameters(self):
        app = FastAPI()

        def endpoint(pagination: PaginationDep):
            return {"skip": pagination.skip, "limit": pagination.limit}

        app.add_api_route("/items", endpoint)
        parameters = {
            parameter["name"]: parameter
            for parameter in app.openapi()["paths"]["/items"]["get"]["parameters"]
        }

        self.assertEqual(parameters["skip"]["schema"]["minimum"], 0)
        self.assertEqual(parameters["skip"]["schema"]["default"], 0)
        self.assertEqual(parameters["limit"]["schema"]["minimum"], 1)
        self.assertEqual(parameters["limit"]["schema"]["maximum"], 100)
        self.assertEqual(parameters["limit"]["schema"]["default"], 20)

    def test_middle_page_metadata(self):
        metadata = build_pagination_metadata(total=43, skip=20, limit=10)

        self.assertEqual(metadata.total, 43)
        self.assertEqual(metadata.page, 3)
        self.assertEqual(metadata.page_size, 10)
        self.assertEqual(metadata.total_pages, 5)
        self.assertTrue(metadata.has_next)
        self.assertTrue(metadata.has_previous)

    def test_empty_collection_has_no_pages_or_navigation(self):
        metadata = build_pagination_metadata(total=0, skip=0, limit=20)

        self.assertEqual(metadata.page, 1)
        self.assertEqual(metadata.total_pages, 0)
        self.assertFalse(metadata.has_next)
        self.assertFalse(metadata.has_previous)

    def test_invalid_values_are_rejected_outside_fastapi_too(self):
        for values in (
            {"total": -1, "skip": 0, "limit": 10},
            {"total": 1, "skip": -1, "limit": 10},
            {"total": 1, "skip": 0, "limit": 0},
        ):
            with self.subTest(values=values), self.assertRaises(ValueError):
                build_pagination_metadata(**values)

    def test_response_headers_use_browser_readable_values(self):
        response = Response()

        set_pagination_headers(response, total=21, skip=20, limit=10)

        self.assertEqual(response.headers["X-Total-Count"], "21")
        self.assertEqual(response.headers["X-Page"], "3")
        self.assertEqual(response.headers["X-Page-Size"], "10")
        self.assertEqual(response.headers["X-Total-Pages"], "3")
        self.assertEqual(response.headers["X-Has-Next"], "false")
        self.assertEqual(response.headers["X-Has-Previous"], "true")


class CountRowsTests(unittest.IsolatedAsyncioTestCase):
    async def test_count_removes_order_limit_and_offset(self):
        records = table("records", column("id"))
        statement = select(records.c.id).order_by(records.c.id).limit(10).offset(20)
        db = SimpleNamespace(
            execute=AsyncMock(
                return_value=SimpleNamespace(scalar_one=lambda: 43),
            )
        )

        total = await count_rows(db, statement)

        self.assertEqual(total, 43)
        count_statement = db.execute.await_args.args[0]
        sql = str(count_statement).upper()
        self.assertIn("COUNT(*)", sql)
        self.assertNotIn("ORDER BY", sql)
        self.assertNotIn("LIMIT", sql)
        self.assertNotIn("OFFSET", sql)


if __name__ == "__main__":
    unittest.main()
