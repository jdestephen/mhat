"""Verify printable clinical documents without a database connection."""
import unittest
from datetime import date, datetime, timezone
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from PyPDF2 import PdfReader
from fastapi import HTTPException

from app.db import base  # noqa: F401 - register all ORM relationships before compiling queries
from app.api.endpoints.doctor import printing
from app.models.clinical import ClinicalOrder
from app.models.hx import MedicalRecord
from app.services.clinical_printing import render_order_pdf, render_prescription_pdf
from app.schemas.hx import PrescriptionInline


class ClinicalPrintingTests(unittest.TestCase):
    def setUp(self):
        self.common = {
            "doctor_name": "María López", "degree": "Medicina interna",
            "clinic_name": "Clínica Central", "phones": ["2222-3333"],
            "address": "Tegucigalpa", "public_email": "consulta@example.com",
            "patient": SimpleNamespace(
                first_name="Paciente", last_name="Prueba", sex="FEMENINO",
                dni="0000000000000", date_of_birth=date(1990, 5, 1),
            ),
            "issued_on": date(2026, 11, 16), "logo_bytes": None,
        }

    def test_prescription_groups_medications_and_optional_duration(self):
        prescriptions = [
            SimpleNamespace(medication_name="Medicamento A", dosage="500 mg", frequency="Cada 8 horas", duration="7 días", instructions=None),
            SimpleNamespace(medication_name="Medicamento B", dosage="250 mg", frequency="Cada día", duration="10 días", instructions="Con alimentos"),
        ]
        pdf = render_prescription_pdf(**self.common, paper_size="A4", show_duration=False, prescriptions=prescriptions)
        reader = PdfReader(BytesIO(pdf))
        text = reader.pages[0].extract_text()
        self.assertEqual(len(reader.pages), 1)
        self.assertAlmostEqual(float(reader.pages[0].mediabox.width), 595.28, places=1)
        self.assertIn("1. Medicamento A", text)
        self.assertIn("2. Medicamento B", text)
        self.assertIn("Fecha de emisión: 16/11/2026", text)
        self.assertNotIn("Duración:", text)
        self.assertIn("consulta@example.com", text)
        self.assertNotIn("colegiación", text.lower())

    def test_order_prints_items_but_excludes_internal_notes(self):
        order = SimpleNamespace(
            order_type="LAB", urgency="URGENT", description="Control",
            items=[{"display": "Hemograma"}, {"display": "Glucosa"}],
            reason="Seguimiento", notes="Nota interna confidencial",
        )
        pdf = render_order_pdf(**self.common, paper_size="LETTER", order=order)
        reader = PdfReader(BytesIO(pdf))
        text = reader.pages[0].extract_text()
        self.assertAlmostEqual(float(reader.pages[0].mediabox.width), 612, places=1)
        self.assertIn("ORDEN CLÍNICA", text)
        self.assertIn("1. Hemograma", text)
        self.assertIn("2. Glucosa", text)
        self.assertNotIn("Nota interna confidencial", text)

    def test_long_prescription_keeps_all_items_across_pages(self):
        prescriptions = [
            SimpleNamespace(
                medication_name=f"Medicamento {index}", dosage="500 mg",
                frequency="Cada 8 horas", duration="7 días",
                instructions="Con alimentos. " * 12,
            ) for index in range(1, 16)
        ]
        pdf = render_prescription_pdf(**self.common, paper_size="A4", show_duration=True, prescriptions=prescriptions)
        reader = PdfReader(BytesIO(pdf))
        text = "\n".join(page.extract_text() for page in reader.pages)
        self.assertGreater(len(reader.pages), 1)
        self.assertIn("15. Medicamento 15", text)
        self.assertEqual(text.count("RECETA MÉDICA"), len(reader.pages))

    def test_inline_prescription_exposes_author_and_record_for_print_button(self):
        record_id, author_id = uuid4(), uuid4()
        prescription = PrescriptionInline.model_validate(SimpleNamespace(
            id=uuid4(), medical_record_id=record_id, created_by=author_id,
            medication_name="Medicamento", dosage=None, frequency=None,
            duration=None, route=None, quantity=None, instructions=None,
            created_at=date(2026, 11, 16),
        ))
        self.assertEqual(prescription.medical_record_id, record_id)
        self.assertEqual(prescription.created_by, author_id)


class ClinicalPrintingEndpointTests(unittest.IsolatedAsyncioTestCase):
    async def test_prescription_query_requires_current_doctor_as_author(self):
        patient_id, doctor_id, record_id = uuid4(), uuid4(), uuid4()
        doctor = SimpleNamespace(id=doctor_id)
        db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(patient_id=patient_id)))
        prescriptions = SimpleNamespace(all=lambda: [])
        db.scalars = AsyncMock(return_value=prescriptions)
        with patch.object(printing, "_printing_context", new=AsyncMock(return_value=(None, None, {}))):
            with self.assertRaises(HTTPException) as failure:
                await printing.print_prescription(patient_id, record_id, db, doctor)
        self.assertEqual(failure.exception.status_code, 404)
        query = db.scalars.await_args.args[0]
        sql = str(query.compile(compile_kwargs={"literal_binds": True}))
        self.assertIn(record_id.hex, sql)
        self.assertIn(doctor_id.hex, sql)
        self.assertIn("prescriptions.created_by", sql)

    async def test_both_attached_and_standalone_orders_can_print(self):
        patient_id, doctor_id, record_id = uuid4(), uuid4(), uuid4()
        doctor = SimpleNamespace(id=doctor_id)
        common = {
            "doctor_name": "Dra. Ejemplo", "degree": "", "clinic_name": "", "phones": [],
            "address": "", "public_email": "", "paper_size": "A4", "show_duration": True,
        }
        for attached in (True, False):
            with self.subTest(attached=attached):
                order = SimpleNamespace(
                    created_by=doctor_id, medical_record_id=record_id if attached else None,
                    patient_id=None if attached else patient_id, order_type="LAB",
                    created_at=datetime(2026, 11, 16, tzinfo=timezone.utc),
                )
                async def get(model, _id):
                    if model is ClinicalOrder:
                        return order
                    if model is MedicalRecord:
                        return SimpleNamespace(patient_id=patient_id)
                    return None
                db = SimpleNamespace(get=AsyncMock(side_effect=get))
                context = AsyncMock(return_value=(SimpleNamespace(), None, common))
                worker = AsyncMock(return_value=b"%PDF-test")
                with patch.object(printing, "_printing_context", new=context), patch.object(printing, "run_in_threadpool", new=worker):
                    response = await printing.print_order(patient_id, uuid4(), db, doctor)
                self.assertEqual(response.media_type, "application/pdf")
                self.assertEqual(response.body, b"%PDF-test")
                self.assertEqual(worker.await_args.kwargs["issued_on"], date(2026, 11, 15))


if __name__ == "__main__":
    unittest.main()
