from fastapi import APIRouter, Depends
from app.models.schemas import InteractionCheckRequest, InteractionCheckResponse
from app.services.interaction_engine import check_interaction
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/interactions", tags=["interactions"])


@router.post("/check", response_model=InteractionCheckResponse)
async def check(payload: InteractionCheckRequest, current_user: dict = Depends(get_current_user)):
    result = await check_interaction(payload.drug_a, payload.drug_b)
    return InteractionCheckResponse(**result)
