"""Create prescription and clinical order PDFs from current doctor settings."""
from datetime import date
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from app.models.clinical import ClinicalOrder, Prescription
from app.models.patient import PatientProfile


INK = colors.HexColor("#252525")
MUTED = colors.HexColor("#545454")
GREEN = colors.HexColor("#1F7A3D")
FONT_DIR = Path(reportlab.__file__).resolve().parent / "fonts"
pdfmetrics.registerFont(TTFont("NumaSans", str(FONT_DIR / "Vera.ttf")))
pdfmetrics.registerFont(TTFont("NumaSans-Bold", str(FONT_DIR / "VeraBd.ttf")))
pdfmetrics.registerFontFamily("NumaSans", normal="NumaSans", bold="NumaSans-Bold")

BODY = ParagraphStyle("body", fontName="NumaSans", fontSize=10.5, leading=16, textColor=INK, spaceAfter=4)
ITEM = ParagraphStyle("item", parent=BODY, fontName="NumaSans-Bold", fontSize=12, leading=17, spaceBefore=10, keepWithNext=True)
SUB = ParagraphStyle("sub", parent=BODY, leftIndent=17)
ORDER_LINE = ParagraphStyle("order_line", parent=SUB, leading=15, spaceAfter=2)


def _clean(value: object) -> str:
    return escape(str(value or "").strip()).replace("\n", "<br/>")


def _age_on(birth_date: date | None, issued_on: date) -> str:
    if not birth_date or birth_date > issued_on:
        return "No registrada"
    years = issued_on.year - birth_date.year - (
        (issued_on.month, issued_on.day) < (birth_date.month, birth_date.day)
    )
    return f"{years} años"


def _draw_paragraph(canvas, value: str, x: float, top: float, width: float, *, size: int = 10,
                    bold: bool = False, align: int = 0, color=MUTED) -> float:
    if not value:
        return 0
    style = ParagraphStyle(
        "header", fontName="NumaSans-Bold" if bold else "NumaSans", fontSize=size,
        leading=size * 1.2, alignment=align, textColor=color,
    )
    paragraph = Paragraph(_clean(value), style)
    _, height = paragraph.wrap(width, 100)
    paragraph.drawOn(canvas, x, top - height)
    return height


def _text_height(value: str, width: float, *, size: int = 10, bold: bool = False) -> float:
    if not value:
        return 0
    style = ParagraphStyle(
        "measure", fontName="NumaSans-Bold" if bold else "NumaSans",
        fontSize=size, leading=size * 1.2,
    )
    return Paragraph(_clean(value), style).wrap(width, 1000)[1]


def _render_pdf(
    *, title: str, doctor_name: str, degree: str, clinic_name: str, phones: list[str],
    address: str, public_email: str, paper_size: str, patient: PatientProfile,
    issued_on: date, story: list, logo_bytes: bytes | None,
) -> bytes:
    page_size = A4 if paper_size == "A4" else letter
    width, height = page_size
    right_x, right_width = width - 225, 190
    name_x = 112 if logo_bytes else 40
    name_width = right_x - name_x - 18
    name_size = 13 if len(doctor_name) > 30 else 16
    clinic_size = 12 if len(clinic_name) > 30 else 15
    phone_text = " / ".join(phones)
    left_label_height = _text_height("Doctor", name_width, size=11)
    left_name_height = _text_height(doctor_name, name_width, size=name_size, bold=True)
    left_degree_height = _text_height(degree, name_width)
    left_height = left_label_height + 3 + left_name_height + (4 + left_degree_height if degree else 0)
    clinic_height = _text_height(clinic_name, right_width, size=clinic_size, bold=True)
    phone_height = _text_height(phone_text, right_width)
    address_height = _text_height(address, right_width)
    right_height = clinic_height + (4 + phone_height if phone_text else 0) + (4 + address_height if address else 0)
    separator_y = height - max(118, 44 + max(left_height, right_height) + 12)
    patient_name = " ".join(part for part in [patient.first_name, patient.last_name] if part) or "No registrado"
    sex = (patient.sex or "No registrado").replace("_", " ").capitalize()
    dni = patient.dni or "No registrado"
    patient_columns = [
        ("Nombre de paciente:", patient_name, 36, width * 0.34),
        ("Edad:", _age_on(patient.date_of_birth, issued_on), width * 0.37, width * 0.13),
        ("Sexo:", sex, width * 0.52, width * 0.14),
        ("DNI:", dni, width * 0.69, width * 0.25),
    ]
    patient_value_top = separator_y - 48
    patient_height = max(_text_height(value, column_width, size=11, bold=True)
                         for _, value, _, column_width in patient_columns)
    title_top = patient_value_top - patient_height - 31
    title_line_y = title_top - 29
    stream = BytesIO()
    document = SimpleDocTemplate(
        stream, pagesize=page_size, leftMargin=38, rightMargin=38,
        topMargin=height - title_line_y + 15, bottomMargin=145,
        title=title, author=doctor_name,
    )
    logo = ImageReader(BytesIO(logo_bytes)) if logo_bytes else None

    def draw_page(canvas, _doc) -> None:
        canvas.saveState()
        canvas.setFillColor(colors.white)
        canvas.rect(0, 0, width, height, stroke=0, fill=1)
        canvas.setStrokeColor(INK)
        canvas.setLineWidth(1.2)
        canvas.rect(17, 17, width - 34, height - 34)

        if logo:
            canvas.saveState()
            if hasattr(canvas, "setFillAlpha"):
                canvas.setFillAlpha(0.075)
            canvas.drawImage(logo, width / 2 - 115, height / 2 - 115, 230, 230,
                             preserveAspectRatio=True, anchor="c", mask="auto")
            canvas.restoreState()
            canvas.drawImage(logo, 36, height - 105, 62, 62,
                             preserveAspectRatio=True, anchor="c", mask="auto")

        _draw_paragraph(canvas, "Doctor", name_x, height - 44, name_width, size=11)
        _draw_paragraph(canvas, doctor_name, name_x, height - 44 - left_label_height - 3,
                        name_width, size=name_size, bold=True, color=INK)
        if degree:
            _draw_paragraph(canvas, degree, name_x,
                            height - 44 - left_label_height - 3 - left_name_height - 4,
                            name_width)
        _draw_paragraph(canvas, clinic_name, right_x, height - 44, right_width,
                        size=clinic_size, bold=True, align=2, color=INK)
        if phones:
            _draw_paragraph(canvas, phone_text, right_x, height - 44 - clinic_height - 4,
                            right_width, align=2)
        if address:
            _draw_paragraph(canvas, address, right_x,
                            height - 44 - clinic_height - (4 + phone_height if phone_text else 0) - 4,
                            right_width, align=2)

        canvas.setLineWidth(0.7)
        canvas.line(18, separator_y, width - 18, separator_y)
        for label, value, x, column_width in patient_columns:
            _draw_paragraph(canvas, label, x, separator_y - 27, column_width, size=9)
            _draw_paragraph(canvas, value, x, patient_value_top, column_width,
                            size=11, bold=True, color=INK)

        _draw_paragraph(canvas, title, 38, title_top, width - 245,
                        size=18, color=GREEN)
        _draw_paragraph(canvas, f"Fecha de emisión: {issued_on:%d/%m/%Y}",
                        width - 203, title_top - 2, 165, size=9, align=2)
        canvas.setStrokeColor(GREEN)
        canvas.setLineWidth(1)
        canvas.line(38, title_line_y, width - 38, title_line_y)

        canvas.setStrokeColor(MUTED)
        canvas.line(width - 225, 98, width - 40, 98)
        _draw_paragraph(canvas, "Firma y Sello", width - 225, 90, 185,
                        size=10, align=TA_CENTER)
        canvas.line(19, 47, width - 19, 47)
        footer = " | ".join(part for part in [f"Dr. {doctor_name}", public_email, phones[0] if phones else ""] if part)
        _draw_paragraph(canvas, footer, 35, 40, width - 70, size=9, align=TA_CENTER)
        canvas.restoreState()

    document.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    return stream.getvalue()


def render_prescription_pdf(*, doctor_name: str, degree: str, clinic_name: str,
                            phones: list[str], address: str, public_email: str,
                            paper_size: str, show_duration: bool, patient: PatientProfile,
                            issued_on: date, prescriptions: list[Prescription],
                            logo_bytes: bytes | None) -> bytes:
    story: list = []
    for index, prescription in enumerate(prescriptions, 1):
        heading = f"{index}. {_clean(prescription.medication_name)}"
        if prescription.dosage:
            heading += f" - {_clean(prescription.dosage)}"
        story.append(Paragraph(heading, ITEM))
        story.append(Paragraph(f"Frecuencia: {_clean(prescription.frequency) or 'No especificada'}", SUB))
        if show_duration and prescription.duration:
            story.append(Paragraph(f"Duración: {_clean(prescription.duration)}", SUB))
        if prescription.instructions:
            story.append(Paragraph(_clean(prescription.instructions), SUB))
        story.append(Spacer(1, 8))
    return _render_pdf(title="RECETA MÉDICA", doctor_name=doctor_name, degree=degree,
                       clinic_name=clinic_name, phones=phones, address=address,
                       public_email=public_email, paper_size=paper_size, patient=patient,
                       issued_on=issued_on, story=story, logo_bytes=logo_bytes)


def render_order_pdf(*, doctor_name: str, degree: str, clinic_name: str,
                     phones: list[str], address: str, public_email: str,
                     paper_size: str, patient: PatientProfile, issued_on: date,
                     order: ClinicalOrder, logo_bytes: bytes | None) -> bytes:
    type_labels = {"LAB": "Laboratorio", "IMAGING": "Imagenología", "PROCEDURE": "Procedimiento"}
    urgency_labels = {"ROUTINE": "Rutina", "URGENT": "Urgente", "STAT": "Inmediata"}
    order_type = getattr(order.order_type, "value", order.order_type)
    urgency = getattr(order.urgency, "value", order.urgency)
    story: list = [
        Paragraph(f"Tipo: {_clean(type_labels.get(order_type, order_type))}", ITEM),
        Paragraph(f"Prioridad: {_clean(urgency_labels.get(urgency, urgency))}", BODY),
    ]
    if order.description:
        story.append(Paragraph(f"Motivo: {_clean(order.description)}", BODY))
    if order.items:
        story.append(Spacer(1, 12))
        story.append(Paragraph("Se solicita:", ITEM))
        for index, item in enumerate(order.items, 1):
            display = item.get("display", "") if isinstance(item, dict) else item.display
            story.append(Paragraph(f"{index}. {_clean(display)}", ORDER_LINE))
    if order.reason:
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"Justificación clínica: {_clean(order.reason)}", BODY))
    return _render_pdf(title="ORDEN CLÍNICA", doctor_name=doctor_name, degree=degree,
                       clinic_name=clinic_name, phones=phones, address=address,
                       public_email=public_email, paper_size=paper_size, patient=patient,
                       issued_on=issued_on, story=story, logo_bytes=logo_bytes)
