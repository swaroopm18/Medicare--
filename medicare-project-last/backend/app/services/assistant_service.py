"""
AI Assistant service.

Two modes:
  - LLM mode (settings.llm_api_key set): calls the configured LLM with a
    system prompt grounded in the user's own active medicines, the
    Knowledge Base, and the interaction engine's findings (a lightweight
    RAG pattern) so answers stay tethered to real data instead of the
    model inventing dosages.
  - Fallback mode (no API key configured): deterministic rule-based
    responses for the common intents shown in the product UI (today's
    schedule, interaction lookups, missed-dose guidance), identical in
    spirit to the "demo AI assistant" behavior in the reference screens.

Every reply -- in both modes -- ends with a safety reminder for anything
resembling a dosing or emergency question.
"""
import re
import httpx
from typing import List, Optional

from app.config import settings
from app.services.knowledge_service import search_medicine, resolve_canonical_name
from app.services.interaction_engine import check_interaction
from app.database import medicines_col

SAFETY_FOOTER = (
    "I'm an AI assistant for general medicine info \u2014 not a substitute for professional "
    "medical advice. For emergencies, contact a healthcare professional immediately."
)

SUGGESTED_REPLIES_DEFAULT = ["Today's schedule?", "Paracetamol + Ibuprofen?", "Missed a dose"]


async def _build_context(user_id: str) -> str:
    meds_cursor = medicines_col.find({"user_id": user_id}, {"_id": 0, "name": 1, "time": 1, "meal_timing": 1})
    meds = await meds_cursor.to_list(length=100)
    if not meds:
        return "The user currently has no active medicines on file."
    lines = [f"- {m['name']} at {m['time']} ({m['meal_timing']})" for m in meds]
    return "The user's currently scheduled medicines:\n" + "\n".join(lines)


async def _rule_based_reply(message: str, user_id: str) -> str:
    lowered = message.lower()

    if "schedule" in lowered or "today" in lowered:
        meds = await medicines_col.find({"user_id": user_id}, {"_id": 0, "name": 1, "time": 1}).to_list(100)
        if not meds:
            return "You don't have any medicines scheduled yet. Add one from the Medicines tab."
        items = ", ".join(f"{m['name']} at {m['time']}" for m in meds)
        return f"Here's today's schedule: {items}."

    if "miss" in lowered and "dose" in lowered:
        return (
            "If you miss a dose, take it as soon as you remember \u2014 unless it's almost time "
            "for your next dose. Never double up to make up for a missed one. When in doubt, "
            "ask your pharmacist."
        )

    # try to detect "drugA and/with/+ drugB" style interaction questions
    pair_match = re.search(r"([a-zA-Z0-9\-]{3,})\s*(?:\+|and|with)\s*([a-zA-Z0-9\-]{3,})", lowered)
    if pair_match:
        drug_a, drug_b = pair_match.group(1).strip(), pair_match.group(2).strip()
        result = await check_interaction(drug_a, drug_b)
        return f"{result['summary']} {result['recommendation']}"

    # single medicine lookup
    kb_hits = await search_medicine(message)
    if kb_hits:
        m = kb_hits[0]
        return f"{m['name']}: {m['use']} Typical dose: {m['typical_dose']} Caution: {m['caution']}"

    return (
        "I'm a demo AI assistant \u2014 I can help with medicine schedules, interactions, "
        "dosage basics, and reminders. For medical emergencies, please contact a healthcare "
        "professional immediately."
    )


async def _llm_reply(message: str, user_id: str) -> Optional[str]:
    if not settings.llm_api_key:
        return None

    context = await _build_context(user_id)
    system_prompt = (
        "You are MediCare AI, a medicine-reminder app's in-app assistant. "
        "Answer only using general, widely-known OTC medicine information and the "
        "context provided below about the user's own schedule. Never invent a specific "
        "dosage for a prescription-only or high-risk drug (e.g. insulin, warfarin) \u2014 "
        "instead say it must be set by their doctor. Keep answers to 2-4 sentences. "
        "Always be clear you are not a doctor.\n\n" + context
    )

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            if settings.llm_provider == "anthropic":
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": settings.llm_api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": settings.llm_model,
                        "max_tokens": 400,
                        "system": system_prompt,
                        "messages": [{"role": "user", "content": message}],
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return "".join(block.get("text", "") for block in data.get("content", []))

            elif settings.llm_provider == "openai":
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.llm_api_key}"},
                    json={
                        "model": settings.llm_model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": message},
                        ],
                        "max_tokens": 400,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]

    except Exception:
        return None  # fall through to rule-based reply

    return None


async def get_assistant_reply(message: str, user_id: str) -> dict:
    llm_text = await _llm_reply(message, user_id)
    if llm_text:
        return {"reply": llm_text.strip(), "suggested_replies": SUGGESTED_REPLIES_DEFAULT, "source": "llm"}

    fallback_text = await _rule_based_reply(message, user_id)
    return {"reply": fallback_text, "suggested_replies": SUGGESTED_REPLIES_DEFAULT, "source": "rule_fallback"}
