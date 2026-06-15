"""
OCR service for doctor document verification.

Extracts text from identity documents (DNI/DPI) and college registration
certificates, then attempts to parse structured fields like document numbers
and names using regex patterns specific to Central American ID formats.
"""
import logging
import re
from dataclasses import dataclass, field
from typing import Optional

import pytesseract
from PIL import Image, ImageFilter, ImageEnhance

logger = logging.getLogger(__name__)


@dataclass
class OcrExtractionResult:
    """Structured result from OCR document processing."""
    raw_text: str = ""
    extracted_dni: Optional[str] = None
    extracted_name: Optional[str] = None
    extracted_college_number: Optional[str] = None
    confidence: float = 0.0
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "raw_text": self.raw_text[:500],  # Truncate for storage
            "extracted_dni": self.extracted_dni,
            "extracted_name": self.extracted_name,
            "extracted_college_number": self.extracted_college_number,
            "confidence": self.confidence,
            "errors": self.errors,
        }


def _preprocess_image(image: Image.Image) -> Image.Image:
    """Apply preprocessing to improve OCR accuracy."""
    # Convert to grayscale
    img = image.convert("L")

    # Resize if too small (OCR works better on larger images)
    width, height = img.size
    if width < 1000:
        scale = 1000 / width
        img = img.resize((int(width * scale), int(height * scale)), Image.LANCZOS)

    # Enhance contrast
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.5)

    # Sharpen
    img = img.filter(ImageFilter.SHARPEN)

    # Binarize (adaptive thresholding via simple method)
    threshold = 128
    img = img.point(lambda p: 255 if p > threshold else 0, "1")

    return img


def _extract_dni_number(text: str) -> Optional[str]:
    """
    Extract DNI/DPI number from OCR text.
    Supports formats: XXXX-XXXX-XXXXX (Guatemala DPI), XX-digit sequences.
    """
    # Guatemala DPI format: XXXX XXXX XXXXX or XXXX-XXXX-XXXXX
    dpi_pattern = r"\b(\d{4}[\s\-]?\d{4,5}[\s\-]?\d{4,5})\b"
    match = re.search(dpi_pattern, text)
    if match:
        # Normalize: remove spaces/dashes
        return re.sub(r"[\s\-]", "", match.group(1))

    # Generic: any 8-13 digit number
    generic_pattern = r"\b(\d{8,13})\b"
    match = re.search(generic_pattern, text)
    if match:
        return match.group(1)

    return None


def _extract_college_number(text: str) -> Optional[str]:
    """
    Extract college registration number from text.
    Looks for patterns like 'Colegiado No. XXXXX', 'No. XXXXX', 'Reg. XXXXX'.
    """
    patterns = [
        r"[Cc]olegiado\s*(?:[Nn][oO°]\.?\s*)?(\d{3,8})",
        r"[Rr]egistro\s*(?:[Nn][oO°]\.?\s*)?(\d{3,8})",
        r"[Nn][oO°]\.?\s*[Dd]e\s*[Cc]olegiado\s*:?\s*(\d{3,8})",
        r"[Nn][oO°]\.?\s*(\d{4,8})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1)
    return None


def _extract_name(text: str) -> Optional[str]:
    """
    Extract name from document text.
    Looks for patterns like 'Nombre: ...', 'NOMBRES: ...'.
    """
    patterns = [
        r"[Nn]ombres?\s*:?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})",
        r"[Nn]ombre\s+[Cc]ompleto\s*:?\s*(.+?)(?:\n|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            name = match.group(1).strip()
            if len(name) > 5:  # Reasonable name length
                return name
    return None


def process_identity_document(file_path: str) -> OcrExtractionResult:
    """
    Process an identity document (DNI/DPI) image and extract fields.
    """
    result = OcrExtractionResult()
    try:
        image = Image.open(file_path)
        processed = _preprocess_image(image)

        # Run OCR with Spanish language
        text = pytesseract.image_to_string(processed, lang="spa", config="--psm 6")
        result.raw_text = text
        result.extracted_dni = _extract_dni_number(text)
        result.extracted_name = _extract_name(text)

        # Calculate confidence based on what we found
        found_fields = sum(1 for v in [result.extracted_dni, result.extracted_name] if v)
        result.confidence = found_fields / 2.0

        logger.info(
            "Identity OCR: dni=%s, name=%s, confidence=%.1f",
            result.extracted_dni, result.extracted_name, result.confidence,
        )
    except Exception as e:
        logger.error("OCR processing failed for identity document: %s", e)
        result.errors.append(f"Error procesando documento de identidad: {str(e)}")

    return result


def process_college_document(file_path: str) -> OcrExtractionResult:
    """
    Process a college registration document image and extract the college number.
    """
    result = OcrExtractionResult()
    try:
        image = Image.open(file_path)
        processed = _preprocess_image(image)

        text = pytesseract.image_to_string(processed, lang="spa", config="--psm 6")
        result.raw_text = text
        result.extracted_college_number = _extract_college_number(text)
        result.extracted_name = _extract_name(text)

        found_fields = sum(1 for v in [result.extracted_college_number, result.extracted_name] if v)
        result.confidence = found_fields / 2.0

        logger.info(
            "College OCR: college_number=%s, name=%s, confidence=%.1f",
            result.extracted_college_number, result.extracted_name, result.confidence,
        )
    except Exception as e:
        logger.error("OCR processing failed for college document: %s", e)
        result.errors.append(f"Error procesando documento de colegiación: {str(e)}")

    return result
