from fastapi import APIRouter, Depends, Query
from typing import List
from app.models.schemas import MedicineKnowledgeOut
from app.services.knowledge_service import search_medicine
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/knowledge-base", tags=["knowledge-base"])


@router.get("/search", response_model=List[MedicineKnowledgeOut])
async def search(q: str = Query(default="", description="Medicine name, e.g. Paracetamol"),
                  current_user: dict = Depends(get_current_user)):
    results = await search_medicine(q)
    return [MedicineKnowledgeOut(**r) for r in results]
