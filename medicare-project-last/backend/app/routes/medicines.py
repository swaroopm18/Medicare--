from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, date
from bson import ObjectId
from typing import List

from app.models.schemas import (
    MedicineCreate, MedicineUpdate, MedicineOut, DoseActionRequest
)
from app.database import medicines_col, history_col
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/medicines", tags=["medicines"])


def _to_out(doc, status_today="pending") -> MedicineOut:
    return MedicineOut(
        id=str(doc["_id"]),
        name=doc["name"],
        dosage_amount=doc["dosage_amount"],
        meal_timing=doc["meal_timing"],
        time=doc["time"],
        frequency_per_day=doc.get("frequency_per_day", 1),
        notes=doc.get("notes"),
        status_today=status_today,
    )


async def _today_status(user_id: str, medicine_id: str) -> str:
    today_start = datetime.combine(date.today(), datetime.min.time())
    entry = await history_col.find_one(
        {"user_id": user_id, "medicine_id": medicine_id, "created_at": {"$gte": today_start}},
        sort=[("created_at", -1)],
    )
    return entry["action"] if entry else "pending"


@router.get("", response_model=List[MedicineOut])
async def list_medicines(current_user: dict = Depends(get_current_user)):
    docs = await medicines_col.find({"user_id": current_user["_id"]}).to_list(length=200)
    out = []
    for d in docs:
        status = await _today_status(current_user["_id"], str(d["_id"]))
        out.append(_to_out(d, status))
    return out


@router.post("", response_model=MedicineOut, status_code=201)
async def add_medicine(payload: MedicineCreate, current_user: dict = Depends(get_current_user)):
    doc = payload.dict()
    doc["user_id"] = current_user["_id"]
    doc["created_at"] = datetime.now()
    result = await medicines_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _to_out(doc)


@router.patch("/{medicine_id}", response_model=MedicineOut)
async def update_medicine(medicine_id: str, payload: MedicineUpdate,
                           current_user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    result = await medicines_col.find_one_and_update(
        {"_id": ObjectId(medicine_id), "user_id": current_user["_id"]},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Medicine not found.")
    status = await _today_status(current_user["_id"], medicine_id)
    return _to_out(result, status)


@router.delete("/{medicine_id}", status_code=204)
async def delete_medicine(medicine_id: str, current_user: dict = Depends(get_current_user)):
    result = await medicines_col.delete_one(
        {"_id": ObjectId(medicine_id), "user_id": current_user["_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found.")
    return None


@router.post("/dose-action", status_code=201)
async def log_dose_action(payload: DoseActionRequest, current_user: dict = Depends(get_current_user)):
    if payload.action not in {"taken", "snoozed", "skipped"}:
        raise HTTPException(status_code=400, detail="action must be taken, snoozed, or skipped.")

    medicine = await medicines_col.find_one(
        {"_id": ObjectId(payload.medicine_id), "user_id": current_user["_id"]}
    )
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found.")

    await history_col.insert_one({
        "user_id": current_user["_id"],
        "medicine_id": payload.medicine_id,
        "medicine_name": medicine["name"],
        "scheduled_time": medicine["time"],
        "action": payload.action,
        "created_at": datetime.now(),
    })
    return {"detail": f"Dose marked as {payload.action}."}


@router.get("/dashboard-summary")
async def dashboard_summary(current_user: dict = Depends(get_current_user)):
    """Powers the top 4 cards + AI Insight banner on the Dashboard screen."""
    meds = await medicines_col.find({"user_id": current_user["_id"]}).to_list(length=200)
    today_start = datetime.combine(date.today(), datetime.min.time())

    taken_today = await history_col.count_documents({
        "user_id": current_user["_id"], "action": "taken", "created_at": {"$gte": today_start}
    })
    total_scheduled_today = len(meds)
    upcoming_today = max(total_scheduled_today - taken_today, 0)
    adherence_pct = round((taken_today / total_scheduled_today) * 100, 0) if total_scheduled_today else 100

    if adherence_pct >= 90:
        insight = "Great job! You're at high adherence today. Keep taking your medicines on schedule."
    elif adherence_pct >= 50:
        insight = "You're keeping up reasonably well today \u2014 a couple of doses still need attention."
    else:
        insight = "Adherence is low today. Try setting reminders closer to your usual dose times."

    return {
        "active_medicines": total_scheduled_today,
        "taken_today": taken_today,
        "upcoming_today": upcoming_today,
        "adherence_pct": adherence_pct,
        "ai_insight": insight,
    }
