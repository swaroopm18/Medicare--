"""
Prescription Scanner service.

Pipeline:
  1. Convert upload (image or PDF) -> raw text via Tesseract OCR (images with 
     preprocessing) or PyMuPDF text extraction (PDFs, falling back to OCR on 
     rasterized pages for scanned PDFs).
  2. Run upgraded regex + heuristic parsing over the raw text to pull out
     medicine name, strength, unit, quantity, frequency, and meal timing.
  3. Fuzzy-match each candidate medicine name against the Knowledge Base
     so it links to structured clinical data instead of raw OCR text.
"""
import io
import re
from typing import List
import pytesseract
from PIL import Image
import fitz  # PyMuPDF

from app.config import settings
from app.services.knowledge_service import search_medicine

if settings.tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

MEAL_KEYWORDS = {
    "after food": ["after food", "after meal", "pc", "post prandial"],
    "before food": ["before food", "before meal", "ac", "empty stomach"],
}

# Robust regex supporting multiple dosage forms, units, and broader name patterns
MED_LINE_RE = re.compile(
    r"""
    (?:
        tab(?:let)?|
        cap(?:sule)?|
        syp|
        syrup|
        inj(?:ection)?|
        cream|
        ointment|
        drop[s]?|
        gel
    )?
    \s*
    ([A-Za-z][A-Za-z0-9\- ]{2,40})
    \s*
    (\d+(?:\.\d+)?)
    \s*
    (mg|mcg|g|ml|iu|%)
    """,
    re.IGNORECASE | re.VERBOSE,
)


def extract_text_from_image(file_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(file_bytes))
    image = image.convert("L")
    image = image.point(lambda x: 0 if x < 140 else 255)
    config = "--oem 3 --psm 6"
    return pytesseract.image_to_string(image, config=config)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text_chunks = []
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    for page in doc:
        page_text = page.get_text().strip()
        if page_text:
            text_chunks.append(page_text)
        else:
            # scanned page with no embedded text -> rasterize and OCR it
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            text_chunks.append(extract_text_from_image(img_bytes))
    doc.close()
    return "\n".join(text_chunks)


def _detect_meal_timing(line: str) -> str:
    lowered = line.lower()
    for label, keywords in MEAL_KEYWORDS.items():
        if any(k in lowered for k in keywords):
            return label.title()
    return "After food"  # safest common default; user confirms before saving


def _detect_frequency(line: str) -> int:
    text = line.lower()

    if re.search(r"\b1[- ]0[- ]1\b", text):
        return 2

    if re.search(r"\b1[- ]1[- ]1\b", text):
        return 3

    if re.search(r"\b1[- ]1[- ]1[- ]1\b", text):
        return 4

    if "once daily" in text or "once a day" in text or "od" in text:
        return 1

    if "twice daily" in text or "twice a day" in text or "bd" in text:
        return 2

    if "three times" in text or "tds" in text:
        return 3

    if "four times" in text or "qid" in text:
        return 4

    return 1


def parse_prescription_text(raw_text: str) -> List[dict]:
    medicines = []
    
    for line in raw_text.splitlines():
        line = line.strip()
        
        if len(line) < 3:
            continue
            
        match = MED_LINE_RE.search(line)
        if not match:
            continue
            
        name = match.group(1).strip()
        strength = match.group(2)
        unit = match.group(3).lower()
        
        qty_match = re.search(
            r"(\d+)\s*(tab|tabs|tablet|tablets|cap|caps|capsule|capsules)",
            line,
            re.I,
        )
        
        quantity = "1 tablet"
        if qty_match:
            quantity = f"{qty_match.group(1)} tablet(s)"
            
        medicines.append(
            {
                "name": name.title(),
                "dosage": f"{strength}{unit}",
                "quantity": quantity,
                "meal_timing": _detect_meal_timing(line),
                "frequency_per_day": _detect_frequency(line),
                "raw_line": line,
            }
        )
        
    return medicines


async def enrich_with_knowledge_base(candidates: List[dict]) -> List[dict]:
    enriched = []
    for c in candidates:
        matches = await search_medicine(c["name"])
        matched_name = matches[0]["name"] if matches else None
        enriched.append({
            "name": c["name"],
            "matched_kb_name": matched_name,
            "dosage": c["dosage"],
            "quantity": c["quantity"],
            "meal_timing": c["meal_timing"],
            "suggested_time": "09:00 AM",
            "confidence": 0.98 if matched_name else 0.30,
        })
    return enriched


async def process_prescription(filename: str, file_bytes: bytes) -> dict:
    if filename.lower().endswith(".pdf"):
        raw_text = extract_text_from_pdf(file_bytes)
    else:
        raw_text = extract_text_from_image(file_bytes)

    candidates = parse_prescription_text(raw_text)
    extracted = await enrich_with_knowledge_base(candidates)

    return {
        "filename": filename,
        "raw_text": raw_text,
        "extracted_medicines": extracted,
    }