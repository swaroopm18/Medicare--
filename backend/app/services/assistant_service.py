"""
MediCare AI Assistant Service

Uses:
- Ollama + local LLM for general medical-information conversations
- MongoDB for the user's personal medicine schedule
- MediCare Knowledge Base for medicine information
- Interaction Engine for medicine-interaction checks
- Deterministic safety handling for emergencies and missed doses

Design principle:
The LLM explains information; it does NOT independently prescribe,
diagnose, or make the authoritative interaction decision.
"""

import re
from typing import Optional

import httpx

from app.config import settings
from app.database import medicines_col
from app.services.interaction_engine import check_interaction
from app.services.knowledge_service import search_medicine


# ============================================================================
# CONSTANTS
# ============================================================================

SAFETY_FOOTER = (
    "This information is for general educational purposes and is not a "
    "substitute for advice from a qualified healthcare professional. "
    "For an emergency or severe symptoms, seek immediate medical care."
)

SUGGESTED_REPLIES_DEFAULT = [
    "Today's schedule?",
    "Paracetamol + Ibuprofen?",
    "Missed a dose",
]

OLLAMA_TIMEOUT = 120.0


# ============================================================================
# TEXT HELPERS
# ============================================================================

def _clean_text(text: str) -> str:
    """Clean LLM output and prevent duplicate safety footers."""

    if not text:
        return ""

    text = text.strip()

    footer_lower = SAFETY_FOOTER.lower()

    while text.lower().count(footer_lower) > 1:
        index = text.lower().rfind(footer_lower)

        if index == -1:
            break

        text = (
            text[:index]
            + text[index + len(SAFETY_FOOTER):]
        )

    return text.strip()


def _with_safety_footer(text: str) -> str:
    """Ensure every response contains the safety footer once."""

    text = _clean_text(text)

    if not text:
        return SAFETY_FOOTER

    if SAFETY_FOOTER.lower() in text.lower():
        return text

    return f"{text}\n\n{SAFETY_FOOTER}"


# ============================================================================
# EMERGENCY DETECTION
# ============================================================================

def _requires_emergency_guidance(message: str) -> bool:
    """
    Detect obvious emergency warning signs.

    This does not diagnose anything. It only provides a safety gate
    for clearly dangerous phrases.
    """

    lowered = message.lower()

    emergency_patterns = [
        # Breathing
        r"\bdifficulty breathing\b",
        r"\btrouble breathing\b",
        r"\bcan't breathe\b",
        r"\bcannot breathe\b",
        r"\bshortness of breath\b",
        r"\bsevere breathing\b",

        # Chest
        r"\bchest pain\b",
        r"\bchest pressure\b",
        r"\bpressure in my chest\b",

        # Neurological
        r"\bface drooping\b",
        r"\bslurred speech\b",
        r"\bsudden weakness\b",
        r"\bsudden numbness\b",
        r"\bseizure\b",
        r"\bunconscious\b",
        r"\bpassed out\b",
        r"\bfainted\b",
        r"\bconfusion\b",

        # Allergic emergencies
        r"\banaphylaxis\b",
        r"\bsevere allergic reaction\b",
        r"\bswelling of (the )?throat\b",
        r"\bswelling of (the )?tongue\b",
        r"\bthroat is closing\b",

        # Severe bleeding
        r"\bsevere bleeding\b",
        r"\buncontrolled bleeding\b",
        r"\bblood won't stop\b",

        # Overdose / poisoning
        r"\boverdose\b",
        r"\btook too many\b",
        r"\bswallowed too many\b",
        r"\bpoisoned\b",
        r"\bpoisoning\b",

        # Severe symptoms
        r"\bsevere abdominal pain\b",
        r"\bsevere headache\b",
        r"\bworst headache\b",
    ]

    return any(
        re.search(pattern, lowered)
        for pattern in emergency_patterns
    )


def _emergency_response() -> str:
    """Deterministic emergency response."""

    return (
        "Your message may describe a potentially serious medical situation. "
        "I cannot diagnose or safely manage an emergency through this chat. "
        "Please seek immediate medical attention or contact your local "
        "emergency medical service. If you are with someone who is seriously "
        "unwell, do not leave them alone while waiting for help."
    )


# ============================================================================
# USER MEDICINE CONTEXT
# ============================================================================

async def _build_context(user_id: str) -> str:
    """Build the user's personal medicine schedule."""

    meds = await medicines_col.find(
        {"user_id": user_id},
        {
            "_id": 0,
            "name": 1,
            "time": 1,
            "meal_timing": 1,
        },
    ).to_list(length=100)

    if not meds:
        return "The user currently has no active medicines on file."

    lines = []

    for medicine in meds:
        name = medicine.get(
            "name",
            "Unknown medicine",
        )

        time = medicine.get(
            "time",
            "time not specified",
        )

        meal_timing = medicine.get(
            "meal_timing",
            "meal timing not specified",
        )

        lines.append(
            f"- {name} at {time} ({meal_timing})"
        )

    return (
        "The user's currently scheduled medicines:\n"
        + "\n".join(lines)
    )


# ============================================================================
# INTENT DETECTION
# ============================================================================

def _is_schedule_question(message: str) -> bool:
    """Detect questions about the user's own medicine schedule."""

    lowered = message.lower()

    schedule_terms = [
        "schedule",
        "today",
        "medicine today",
        "medicines today",
        "medication today",
        "medications today",
        "what am i taking",
        "what medicines am i taking",
        "what medication am i taking",
        "my medicines",
        "my medication",
        "my medications",
    ]

    return any(
        term in lowered
        for term in schedule_terms
    )


def _is_missed_dose_question(message: str) -> bool:
    """Detect missed-dose questions."""

    lowered = message.lower()

    missed_terms = [
        "missed dose",
        "miss a dose",
        "miss my dose",
        "missed my dose",
        "forgot my dose",
        "forgot dose",
        "forgot to take",
        "forgot my medicine",
        "forgot my medication",
        "didn't take my medicine",
        "did not take my medicine",
        "didn't take my medication",
        "did not take my medication",
    ]

    return any(
        term in lowered
        for term in missed_terms
    )


def _looks_like_symptom_question(message: str) -> bool:
    """Detect common symptom/general-health questions."""

    lowered = message.lower()

    symptoms = [
        "fever",
        "cold",
        "cough",
        "headache",
        "head pain",
        "sore throat",
        "throat pain",
        "runny nose",
        "blocked nose",
        "stuffy nose",
        "body pain",
        "body ache",
        "stomach pain",
        "vomiting",
        "nausea",
        "diarrhea",
        "dizziness",
        "pain",
        "symptom",
        "sick",
        "suffering",
        "feel ill",
        "not feeling well",
    ]

    return any(
        symptom in lowered
        for symptom in symptoms
    )


def _looks_like_medicine_question(message: str) -> bool:
    """Detect medicine-information questions."""

    lowered = message.lower()

    medicine_terms = [
        "what is",
        "what are",
        "uses of",
        "use of",
        "side effects",
        "side effect",
        "precautions",
        "warning",
        "caution",
        "medicine",
        "medication",
        "tablet",
        "capsule",
        "drug",
    ]

    return any(
        term in lowered
        for term in medicine_terms
    )


# ============================================================================
# INTERACTION DETECTION
# ============================================================================

def _extract_drug_pair(
    message: str,
) -> Optional[tuple[str, str]]:
    """
    Detect:

        Paracetamol + Ibuprofen
        Paracetamol and Ibuprofen
        Paracetamol with Ibuprofen
    """

    lowered = message.lower().strip()

    patterns = [
        r"\b([a-zA-Z][a-zA-Z0-9\-]{2,})\s*\+\s*([a-zA-Z][a-zA-Z0-9\-]{2,})\b",

        r"\b([a-zA-Z][a-zA-Z0-9\-]{2,})\s+and\s+([a-zA-Z][a-zA-Z0-9\-]{2,})\b",

        r"\b([a-zA-Z][a-zA-Z0-9\-]{2,})\s+with\s+([a-zA-Z][a-zA-Z0-9\-]{2,})\b",

        r"\btake\s+([a-zA-Z][a-zA-Z0-9\-]{2,})\s+and\s+([a-zA-Z][a-zA-Z0-9\-]{2,})\b",

        r"\bcombine\s+([a-zA-Z][a-zA-Z0-9\-]{2,})\s+and\s+([a-zA-Z][a-zA-Z0-9\-]{2,})\b",
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            lowered,
        )

        if match:

            return (
                match.group(1).strip(),
                match.group(2).strip(),
            )

    return None


def _looks_like_interaction_question(
    message: str,
) -> bool:
    """Detect explicit interaction questions."""

    lowered = message.lower()

    interaction_terms = [
        "interaction",
        "interactions",
        "take together",
        "take with",
        "can i take",
        "combine",
        "combination",
        "together",
        "along with",
        "mix",
    ]

    return any(
        term in lowered
        for term in interaction_terms
    )


# ============================================================================
# SCHEDULE
# ============================================================================

async def _schedule_reply(
    user_id: str,
) -> str:
    """Return the user's medicine schedule from MongoDB."""

    meds = await medicines_col.find(
        {"user_id": user_id},
        {
            "_id": 0,
            "name": 1,
            "time": 1,
            "meal_timing": 1,
        },
    ).to_list(length=100)

    if not meds:

        return (
            "You don't have any medicines scheduled yet. "
            "Add a medicine from the Medicines tab."
        )

    items = []

    for medicine in meds:

        name = medicine.get(
            "name",
            "Unknown medicine",
        )

        time = medicine.get(
            "time",
            "time not specified",
        )

        meal = medicine.get(
            "meal_timing"
        )

        if meal:

            items.append(
                f"• {name} — {time} ({meal})"
            )

        else:

            items.append(
                f"• {name} — {time}"
            )

    return (
        "**Today's medicine schedule**\n"
        + "\n".join(items)
    )


# ============================================================================
# MISSED DOSE
# ============================================================================

async def _missed_dose_reply(
    message: str,
    user_id: str,
) -> str:
    """
    Conservative missed-dose guidance.

    The assistant must not give a blanket "take it immediately"
    instruction because missed-dose instructions depend on the
    specific medicine, prescribed dose, schedule, and timing.
    """

    message_lower = message.lower()

    # Try to identify a medicine mentioned by the user.
    medicine_name = None

    # Common medicines that may appear in user questions.
    known_medicines = [
        "paracetamol",
        "acetaminophen",
        "ibuprofen",
        "amoxicillin",
        "azithromycin",
        "cetirizine",
        "omeprazole",
        "metformin",
        "aspirin",
        "atorvastatin",
        "amlodipine",
    ]

    for medicine in known_medicines:
        if medicine in message_lower:
            medicine_name = medicine
            break

    # If a specific medicine was mentioned, give conservative guidance.
    if medicine_name:
        return (
            f"For a missed dose of {medicine_name}, the correct action depends "
            "on the prescribed dose, schedule, and how long ago the dose was missed. "
            "Check the medicine label or prescription instructions first. "
            "Do not take a double dose to make up for a missed dose unless a "
            "healthcare professional specifically tells you to. "
            "If you tell me the exact medicine, dose, and when the dose was due, "
            "I can help you understand the general missed-dose guidance available "
            "in MediCare."
        )

    # Generic fallback when no medicine can be identified.
    return (
        "Missed-dose instructions depend on the specific medicine, dose, "
        "schedule, and timing. Check the medicine label or prescription "
        "instructions first. Do not take a double dose to make up for a "
        "missed dose unless a healthcare professional specifically tells "
        "you to do so. Tell me the medicine name, dose, and when the dose "
        "was due so I can help you with the relevant general guidance."
    )


# ============================================================================
# MEDICINE KNOWLEDGE BASE
# ============================================================================

async def _medicine_lookup(
    message: str,
) -> Optional[str]:
    """Search the MediCare medicine knowledge base."""

    try:

        hits = await search_medicine(
            message
        )

    except Exception as exc:

        print(
            "Medicine knowledge-base lookup failed:",
            str(exc),
        )

        return None

    if not hits:
        return None

    medicine = hits[0]

    name = medicine.get(
        "name",
        "Medicine",
    )

    use = medicine.get(
        "use",
        "General medicine information.",
    )

    typical_dose = medicine.get(
        "typical_dose",
        "Not available.",
    )

    caution = medicine.get(
        "caution",
        "Confirm safety and dosing with a healthcare professional.",
    )

    return (
        f"**{name}**\n\n"
        f"**Uses:** {use}\n\n"
        f"**Typical information:** {typical_dose}\n\n"
        f"**Caution:** {caution}"
    )


# ============================================================================
# INTERACTION ENGINE
# ============================================================================

async def _interaction_reply(
    drug_a: str,
    drug_b: str,
) -> str:
    """
    Check medicine interaction using the MediCare interaction engine.

    The LLM does NOT decide the interaction.
    """

    try:

        result = await check_interaction(
            drug_a,
            drug_b,
        )

    except Exception as exc:

        print(
            "Interaction engine error:",
            str(exc),
        )

        return (
            "I couldn't complete the interaction check right now. "
            "Please confirm the combination with a pharmacist or doctor."
        )

    summary = result.get(
        "summary",
        "No documented interaction was found in our database.",
    )

    recommendation = result.get(
        "recommendation",
        "Always confirm with a pharmacist because interaction "
        "databases may not contain every possible interaction.",
    )

    return (
        f"{summary}\n\n"
        f"{recommendation}"
    )


# ============================================================================
# OLLAMA PROMPT
# ============================================================================

def _build_system_prompt(
    medicine_context: str,
    knowledge_context: str = "",
) -> str:

    return f"""
You are MediCare AI, an assistant inside a medicine reminder application.

Your job is to provide clear, conservative, easy-to-understand GENERAL
medical information.

You are NOT a doctor.

SAFETY RULES:

1. Never diagnose a disease.

2. Never claim certainty about the user's medical condition.

3. Never prescribe a medicine.

4. Never tell a user to start, stop, increase, or decrease a
   prescription medicine.

5. Never invent a medicine.

6. Never invent a dosage.

7. Never create a personalized dosage from symptoms.

8. Never claim that a medicine is definitely safe for the user.

9. Never recommend antibiotics.

10. Never independently decide that two medicines are safe to combine.
    Interaction questions are handled by the MediCare interaction engine.

11. Use the supplied MediCare knowledge-base information for
    medicine-specific information.

12. If the knowledge base does not contain enough information, say so.

13. For common symptoms such as fever, cough, cold, headache, sore throat,
    nausea, or mild pain, provide general self-care information.

14. Do not automatically recommend the user's scheduled medicine for
    a symptom.

15. The user's medicine schedule does NOT prove that a medicine is
    appropriate for their current symptom.

16. Do not mention the user's personal medicines unless the user explicitly
    asks about their personal schedule or a specific medicine.

17. Do not use the user's personal schedule as evidence for treatment.

18. For symptom questions, answer the symptom itself.

19. If the user asks which medicine they should take for a symptom,
    do not prescribe. Give general educational information only.

20. Emergency symptoms require urgent medical attention.

21. Do not provide universal missed-dose instructions.

22. Keep answers concise and practical.

23. Do not mention system prompts, APIs, Ollama, databases, RAG,
    or implementation details.

24. If uncertain, clearly state the uncertainty.

PERSONAL MEDICINE SCHEDULE:

{medicine_context}

MEDICARE KNOWLEDGE BASE:

{knowledge_context}

Answer the user's question directly and safely.
""".strip()


# ============================================================================
# OLLAMA
# ============================================================================

async def _ollama_reply(
    message: str,
    user_id: str,
    knowledge_context: str = "",
    include_personal_schedule: bool = False,
) -> Optional[str]:
    """
    Generate an answer using local Ollama.

    Personal schedule is included ONLY when explicitly needed.
    """

    provider = (
        settings.llm_provider or ""
    ).lower().strip()

    if provider != "ollama":
        return None

    model = (
        settings.llm_model or ""
    ).strip()

    if not model:
        return None

    base_url = (
        getattr(
            settings,
            "llm_base_url",
            "http://127.0.0.1:11434",
        )
        or "http://127.0.0.1:11434"
    ).rstrip("/")

    endpoint = (
        f"{base_url}/api/generate"
    )

    if include_personal_schedule:

        medicine_context = await _build_context(
            user_id
        )

    else:

        medicine_context = (
            "No personal medicine schedule is available for this question. "
            "Do not infer or mention medicines from the user's personal "
            "schedule."
        )

    system_prompt = _build_system_prompt(
        medicine_context=medicine_context,
        knowledge_context=knowledge_context,
    )

    prompt = f"""
SYSTEM:
{system_prompt}

USER:
{message}

ASSISTANT:
""".strip()

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.15,
        },
    }

    try:

        async with httpx.AsyncClient(
            timeout=OLLAMA_TIMEOUT
        ) as client:

            response = await client.post(
                endpoint,
                json=payload,
            )

            response.raise_for_status()

            data = response.json()

            text = data.get(
                "response",
                "",
            )

            if not text:
                return None

            return _clean_text(
                text
            )

    except httpx.ConnectError:

        print(
            "Ollama connection failed. "
            f"Make sure Ollama is running at {base_url}"
        )

        return None

    except httpx.TimeoutException:

        print(
            "Ollama request timed out."
        )

        return None

    except httpx.HTTPStatusError as exc:

        print(
            "Ollama request failed:",
            exc.response.status_code,
            exc.response.text,
        )

        return None

    except Exception as exc:

        print(
            "Unexpected Ollama error:",
            str(exc),
        )

        return None


# ============================================================================
# RULE-BASED FALLBACK
# ============================================================================

async def _rule_based_reply(
    message: str,
    user_id: str,
) -> str:

    if _requires_emergency_guidance(
        message
    ):
        return _emergency_response()

    if _is_schedule_question(
        message
    ):
        return await _schedule_reply(
            user_id
        )

    if _is_missed_dose_question(
        message
    ):
        return await _missed_dose_reply(
            message,
            user_id,
        )

    pair = _extract_drug_pair(
        message
    )

    if pair and (
        _looks_like_interaction_question(
            message
        )
        or "+" in message
        or " with " in message.lower()
        or " and " in message.lower()
    ):

        return await _interaction_reply(
            pair[0],
            pair[1],
        )

    medicine_answer = await _medicine_lookup(
        message
    )

    if medicine_answer:
        return medicine_answer

    if _looks_like_symptom_question(
        message
    ):

        return (
            "I can provide general information, but I can't diagnose "
            "your condition or prescribe a medicine. For mild symptoms, "
            "rest, stay hydrated, and monitor how you feel. If symptoms "
            "are severe, worsening, persistent, or you develop difficulty "
            "breathing, chest pain, confusion, severe dehydration, or "
            "another emergency warning sign, seek medical care promptly."
        )

    return (
        "I can help with your medicine schedule, medicine information, "
        "drug interactions, and general health questions. "
        "Tell me what you need help with."
    )


# ============================================================================
# MAIN ASSISTANT
# ============================================================================

async def get_assistant_reply(
    message: str,
    user_id: str,
) -> dict:

    message = (
        message or ""
    ).strip()

    # ------------------------------------------------------------------------
    # EMPTY MESSAGE
    # ------------------------------------------------------------------------

    if not message:

        return {
            "reply": "Please enter a question.",
            "suggested_replies": SUGGESTED_REPLIES_DEFAULT,
            "source": "validation",
        }

    # ------------------------------------------------------------------------
    # EMERGENCY
    # ------------------------------------------------------------------------

    if _requires_emergency_guidance(
        message
    ):

        return {
            "reply": _with_safety_footer(
                _emergency_response()
            ),
            "suggested_replies": SUGGESTED_REPLIES_DEFAULT,
            "source": "safety",
        }

    # ------------------------------------------------------------------------
    # PERSONAL SCHEDULE
    # ------------------------------------------------------------------------

    if _is_schedule_question(
        message
    ):

        reply = await _schedule_reply(
            user_id
        )

        return {
            "reply": _with_safety_footer(
                reply
            ),
            "suggested_replies": SUGGESTED_REPLIES_DEFAULT,
            "source": "schedule",
        }

    # ------------------------------------------------------------------------
    # MISSED DOSE
    # ------------------------------------------------------------------------

    if _is_missed_dose_question(
        message
    ):

        reply = await _missed_dose_reply(
            message,
            user_id,
        )

        return {
            "reply": _with_safety_footer(
                reply
            ),
            "suggested_replies": SUGGESTED_REPLIES_DEFAULT,
            "source": "missed_dose",
        }

    # ------------------------------------------------------------------------
    # INTERACTION
    # ------------------------------------------------------------------------

    pair = _extract_drug_pair(
        message
    )

    if pair and (
        _looks_like_interaction_question(
            message
        )
        or "+" in message
        or " with " in message.lower()
        or " and " in message.lower()
    ):

        reply = await _interaction_reply(
            pair[0],
            pair[1],
        )

        return {
            "reply": _with_safety_footer(
                reply
            ),
            "suggested_replies": SUGGESTED_REPLIES_DEFAULT,
            "source": "interaction_engine",
        }

    # ------------------------------------------------------------------------
    # MEDICINE INFORMATION
    # ------------------------------------------------------------------------

    medicine_answer = None

    if _looks_like_medicine_question(
        message
    ):

        medicine_answer = await _medicine_lookup(
            message
        )

    if medicine_answer:

        llm_text = await _ollama_reply(
            message=message,
            user_id=user_id,
            knowledge_context=medicine_answer,
            include_personal_schedule=False,
        )

        if llm_text:

            return {
                "reply": _with_safety_footer(
                    llm_text
                ),
                "suggested_replies": SUGGESTED_REPLIES_DEFAULT,
                "source": "ollama",
            }

        return {
            "reply": _with_safety_footer(
                medicine_answer
            ),
            "suggested_replies": SUGGESTED_REPLIES_DEFAULT,
            "source": "knowledge_base",
        }

    # ------------------------------------------------------------------------
    # GENERAL HEALTH / SYMPTOM QUESTION
    # ------------------------------------------------------------------------

    llm_text = await _ollama_reply(
        message=message,
        user_id=user_id,
        knowledge_context=(
            "No specific MediCare knowledge-base entry was found "
            "for this question."
        ),
        include_personal_schedule=False,
    )

    if llm_text:

        return {
            "reply": _with_safety_footer(
                llm_text
            ),
            "suggested_replies": SUGGESTED_REPLIES_DEFAULT,
            "source": "ollama",
        }

    # ------------------------------------------------------------------------
    # FALLBACK
    # ------------------------------------------------------------------------

    fallback_text = await _rule_based_reply(
        message,
        user_id,
    )

    return {
        "reply": _with_safety_footer(
            fallback_text
        ),
        "suggested_replies": SUGGESTED_REPLIES_DEFAULT,
        "source": "rule_fallback",
    }