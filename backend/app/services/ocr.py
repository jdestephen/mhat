import pytesseract
from PIL import Image
import io
import shutil
import os
from app.core.config import settings

def process_image(file_path: str) -> str:
    try:
        text = pytesseract.image_to_string(Image.open(file_path))
        return text
    except Exception as e:
        print(f"Error processing image: {e}")
        return ""

# Simple dummy function to extracting specific fields
# In a real app, this would use an LLM or specific Regex patterns
def extract_metadata_from_text(text: str) -> dict:
    data = {"raw_summary": text[:100]}
    # Mock extraction logic
    if "fecha" in text.lower():
        data["has_date"] = True
    return data
