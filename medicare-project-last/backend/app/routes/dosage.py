from fastapi import APIRouter, Depends
from app.models.schemas import DosageCalcRequest, DosageCalcResponse
from app.services.dosage_engine import calculate_dosage
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/dosage", tags=["dosage"])


@router.post("/calculate", response_model=DosageCalcResponse)
async def calculate(payload: DosageCalcRequest, current_user: dict = Depends(get_current_user)):
    result = await calculate_dosage(
        weight_kg=payload.weight_kg,
        medicine=payload.medicine,
        doses_per_day=payload.doses_per_day,
        age_years=payload.age_years,
    )
    return DosageCalcResponse(**result)
