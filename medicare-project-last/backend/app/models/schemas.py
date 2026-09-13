"""
Pydantic request/response schemas shared across routes.
Kept in one file for simplicity; split further as the app grows.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    member_since: datetime
    dark_mode: bool = False
    medicine_alarm_sound: bool = True
    push_notifications: bool = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UpdatePreferences(BaseModel):
    dark_mode: Optional[bool] = None
    medicine_alarm_sound: Optional[bool] = None
    push_notifications: Optional[bool] = None


# ---------- Medicines / Reminders ----------
class MedicineCreate(BaseModel):
    name: str
    dosage_amount: str          # e.g. "500" (mg) -- kept as string to match "650", "25" etc in UI
    meal_timing: str = "After food"   # "After food" | "Before food" | "Any time"
    time: str                   # "09:28 AM"
    frequency_per_day: int = 1
    notes: Optional[str] = None


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    dosage_amount: Optional[str] = None
    meal_timing: Optional[str] = None
    time: Optional[str] = None
    frequency_per_day: Optional[int] = None
    notes: Optional[str] = None


class MedicineOut(BaseModel):
    id: str
    name: str
    dosage_amount: str
    meal_timing: str
    time: str
    frequency_per_day: int
    notes: Optional[str] = None
    status_today: str = "pending"   # pending | taken | snoozed | skipped


class DoseActionRequest(BaseModel):
    medicine_id: str
    action: str    # "taken" | "snoozed" | "skipped"


# ---------- Interaction Checker ----------
class InteractionCheckRequest(BaseModel):
    drug_a: str
    drug_b: str


class InteractionCheckResponse(BaseModel):
    drug_a: str
    drug_b: str
    severity: str          # "none" | "mild" | "moderate" | "severe" | "unknown"
    summary: str
    recommendation: str
    source: str = "rule_engine"


# ---------- Knowledge Base ----------
class MedicineKnowledgeOut(BaseModel):
    name: str
    aliases: List[str] = []
    use: str
    typical_dose: str
    max_daily: Optional[str] = None
    caution: str
    category: Optional[str] = None


# ---------- Dosage Calculator ----------
class DosageCalcRequest(BaseModel):
    weight_kg: float = Field(gt=0, le=400)
    medicine: str
    doses_per_day: int = Field(default=2, ge=1, le=6)
    age_years: Optional[float] = None


class DosageCalcResponse(BaseModel):
    medicine: str
    per_dose_mg: float
    doses_per_day: int
    estimated_daily_total_mg: float
    max_daily_mg: float
    within_safe_range: bool
    warnings: List[str] = []
    disclaimer: str = (
        "Estimate only \u2014 always confirm with a licensed clinician before administering."
    )


# ---------- Prescription Scanner ----------
class ExtractedMedicine(BaseModel):
    name: str
    matched_kb_name: Optional[str] = None
    dosage: Optional[str] = None
    quantity: Optional[str] = None
    meal_timing: Optional[str] = None
    suggested_time: Optional[str] = None
    confidence: float = 0.0


class ScanResponse(BaseModel):
    scan_id: str
    filename: str
    raw_text: str
    extracted_medicines: List[ExtractedMedicine]


class ScanConfirmRequest(BaseModel):
    scan_id: str
    medicines: List[MedicineCreate]


# ---------- AI Assistant ----------
class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    suggested_replies: List[str] = []
    source: str  # "llm" | "rule_fallback"


# ---------- Reports ----------
class AdherenceSummary(BaseModel):
    taken: int
    snoozed: int
    skipped: int
    adherence_pct: float


class HistoryEntry(BaseModel):
    medicine: str
    scheduled: str
    action: str
    time: datetime
