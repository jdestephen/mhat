"""Model metadata coverage for pagination indexes."""

import unittest

from app.db import base as _models  # noqa: F401 - register all ORM models
from app.models.clinical import ClinicalOrder
from app.models.hx import MedicalRecord, RecordViewLog, VitalSigns
from app.models.sharing import ShareToken
from app.models.user import DoctorPatientAccess


def index_columns(model: type, name: str) -> tuple[str, ...]:
    index = next(index for index in model.__table__.indexes if index.name == name)
    return tuple(column.name for column in index.columns)


class PaginationIndexTests(unittest.TestCase):
    def test_high_growth_list_indexes_match_query_order(self):
        expected = (
            (
                MedicalRecord,
                "ix_medical_records_patient_date_page",
                ("patient_id", "record_date", "created_at", "id"),
            ),
            (
                VitalSigns,
                "ix_vital_signs_patient_measured_page",
                ("patient_id", "measured_at", "id"),
            ),
            (
                ClinicalOrder,
                "ix_clinical_orders_patient_created_page",
                ("patient_id", "created_at", "id"),
            ),
            (
                RecordViewLog,
                "ix_record_view_logs_record_viewed_page",
                ("medical_record_id", "viewed_at", "id"),
            ),
            (
                ShareToken,
                "ix_share_tokens_patient_created_page",
                ("patient_id", "created_at", "id"),
            ),
            (
                DoctorPatientAccess,
                "ix_doctor_patient_access_doctor_created_page",
                ("doctor_id", "created_at", "id"),
            ),
        )

        for model, name, columns in expected:
            with self.subTest(index=name):
                self.assertEqual(index_columns(model, name), columns)


if __name__ == "__main__":
    unittest.main()
