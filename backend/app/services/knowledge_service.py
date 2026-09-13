"""
Medicine Knowledge Base service.
Backed by MongoDB (seeded from app/data/medicine_kb.json), with fuzzy
name/alias matching so "dolo650" resolves to "Paracetamol", "brufen" to
"Ibuprofen", etc.
"""
from typing import Optional, List
from rapidfuzz import process, fuzz

from app.database import knowledge_col


async def _all_docs() -> List[dict]:
    return await knowledge_col.find({}, {"_id": 0}).to_list(length=1000)


async def search_medicine(query: str) -> List[dict]:
    """Substring + fuzzy search across name and aliases. Returns best matches first."""
    query = query.strip().lower()
    if not query:
        return await _all_docs()

    docs = await _all_docs()

    # 1) exact/substring hits first (name or alias)
    substring_hits = [
        d for d in docs
        if query in d["name"].lower() or any(query in a.lower() for a in d.get("aliases", []))
    ]
    if substring_hits:
        return substring_hits

    # 2) fuzzy fallback
    choices = {}
    for d in docs:
        choices[d["name"]] = d["name"]
        for a in d.get("aliases", []):
            choices[a] = d["name"]

    matches = process.extract(query, choices.keys(), scorer=fuzz.WRatio, limit=5)
    matched_names = {choices[m[0]] for m in matches if m[1] >= 60}
    return [d for d in docs if d["name"] in matched_names]


async def resolve_canonical_name(query: str) -> Optional[str]:
    """Return the canonical KB medicine name for a free-text query, or None."""
    results = await search_medicine(query)
    return results[0]["name"] if results else None


async def get_by_name(name: str) -> Optional[dict]:
    return await knowledge_col.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}}, {"_id": 0})
