"""
Drug Interaction Checker - rule-based engine.

Design notes (why this instead of a black-box ML model):
Interaction data is symmetric (A+B == B+A), sparse, and safety-critical.
A curated, versioned, symmetric lookup table -- expandable over time by a
pharmacist/clinical reviewer -- is both more auditable and safer than an
opaque model making up interactions it was never trained on. This engine
is intentionally built so the underlying MongoDB collection can be grown
into a much larger dataset (e.g. imported from DrugBank/RxNorm/openFDA)
without changing any application code.
"""
from typing import Optional
from app.database import interactions_col
from app.services.knowledge_service import resolve_canonical_name

SEVERITY_RANK = {"severe": 3, "moderate": 2, "mild": 1, "none": 0, "unknown": -1}


async def check_interaction(drug_a: str, drug_b: str) -> dict:
    canon_a = await resolve_canonical_name(drug_a) or drug_a
    canon_b = await resolve_canonical_name(drug_b) or drug_b

    key_a, key_b = canon_a.lower(), canon_b.lower()

    doc = await interactions_col.find_one({
        "$or": [
            {"drug_a": key_a, "drug_b": key_b},
            {"drug_a": key_b, "drug_b": key_a},
        ]
    })

    if not doc:
        return {
            "drug_a": canon_a,
            "drug_b": canon_b,
            "severity": "unknown",
            "summary": "No documented interaction found in our database.",
            "recommendation": "Always confirm with a pharmacist, as this database is not exhaustive.",
            "source": "rule_engine",
        }

    return {
        "drug_a": canon_a,
        "drug_b": canon_b,
        "severity": doc["severity"],
        "summary": doc["summary"],
        "recommendation": doc["recommendation"],
        "source": "rule_engine",
    }


async def check_all_pairs(drug_names: list[str]) -> list[dict]:
    """Used by the AI assistant / reports to flag risky combinations across
    a user's full active medicine list."""
    results = []
    for i in range(len(drug_names)):
        for j in range(i + 1, len(drug_names)):
            result = await check_interaction(drug_names[i], drug_names[j])
            if SEVERITY_RANK.get(result["severity"], -1) >= SEVERITY_RANK["mild"]:
                results.append(result)
    return results
