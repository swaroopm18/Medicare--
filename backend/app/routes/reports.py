from fastapi import APIRouter, Depends
from app.database import history_col
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/adherence")
async def adherence_breakdown(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": current_user["_id"]}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
    ]
    counts = {doc["_id"]: doc["count"] async for doc in history_col.aggregate(pipeline)}
    taken = counts.get("taken", 0)
    snoozed = counts.get("snoozed", 0)
    skipped = counts.get("skipped", 0)
    total = taken + snoozed + skipped
    adherence_pct = round((taken / total) * 100, 1) if total else 0.0

    return {
        "taken": taken,
        "snoozed": snoozed,
        "skipped": skipped,
        "adherence_pct": adherence_pct,
    }


@router.get("/history")
async def recent_history(current_user: dict = Depends(get_current_user), limit: int = 20):
    docs = await history_col.find(
        {"user_id": current_user["_id"]},
        {"_id": 0, "medicine_name": 1, "scheduled_time": 1, "action": 1, "created_at": 1},
    ).sort("created_at", -1).to_list(length=limit)

    return [
        {
            "medicine": d["medicine_name"],
            "scheduled": d["scheduled_time"],
            "action": d["action"],
            "time": d["created_at"],
        }
        for d in docs
    ]
