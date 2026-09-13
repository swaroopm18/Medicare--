from fastapi import APIRouter, Depends
from datetime import datetime
from app.models.schemas import ChatRequest, ChatResponse
from app.services.assistant_service import get_assistant_reply
from app.database import chat_col
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, current_user: dict = Depends(get_current_user)):
    result = await get_assistant_reply(payload.message, current_user["_id"])

    await chat_col.insert_one({
        "user_id": current_user["_id"],
        "message": payload.message,
        "reply": result["reply"],
        "source": result["source"],
        "created_at": datetime.now(),
    })

    return ChatResponse(**result)


@router.get("/history")
async def chat_history(current_user: dict = Depends(get_current_user)):
    docs = await chat_col.find(
        {"user_id": current_user["_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(length=50)
    return list(reversed(docs))
