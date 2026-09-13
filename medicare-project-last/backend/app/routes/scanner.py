from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from datetime import datetime
from bson import ObjectId

from app.models.schemas import ScanResponse, ScanConfirmRequest, ExtractedMedicine
from app.services.ocr_service import process_prescription
from app.database import scans_col, medicines_col
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/scanner", tags=["scanner"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_SIZE_MB = 10


@router.post("/upload", response_model=ScanResponse)
async def upload_prescription(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP, or PDF files are supported.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {MAX_SIZE_MB}MB limit.")

    result = await process_prescription(file.filename, file_bytes)

    scan_doc = {
        "user_id": current_user["_id"],
        "filename": result["filename"],
        "raw_text": result["raw_text"],
        "extracted_medicines": result["extracted_medicines"],
        "created_at": datetime.now(),
    }
    inserted = await scans_col.insert_one(scan_doc)

    return ScanResponse(
        scan_id=str(inserted.inserted_id),
        filename=result["filename"],
        raw_text=result["raw_text"],
        extracted_medicines=[ExtractedMedicine(**m) for m in result["extracted_medicines"]],
    )


@router.post("/confirm", status_code=201)
async def confirm_scan(payload: ScanConfirmRequest, current_user: dict = Depends(get_current_user)):
    scan = await scans_col.find_one({"_id": ObjectId(payload.scan_id), "user_id": current_user["_id"]})
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")

    inserted_ids = []
    for med in payload.medicines:
        doc = med.dict()
        doc["user_id"] = current_user["_id"]
        doc["created_at"] = datetime.now()
        doc["source_scan_id"] = payload.scan_id
        result = await medicines_col.insert_one(doc)
        inserted_ids.append(str(result.inserted_id))

    return {"detail": "Medicines added to reminders.", "medicine_ids": inserted_ids}
