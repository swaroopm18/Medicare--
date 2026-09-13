"""
Dosage Calculator - rule-based clinical formula engine.

Design notes: real-world pediatric/weight-based dosing is formula + cap
driven (mg/kg with a hard max), not something to approximate with a
generic regression model trained on a handful of examples -- that would
be *less* safe than a transparent, auditable formula. This engine reads
its formulas from MongoDB (seeded from app/data/dosage_rules.json) so
new medicines/rules can be added by a clinical reviewer without a
redeploy.
"""
from typing import Optional
from app.database import dosage_rules_col
from app.services.knowledge_service import resolve_canonical_name


async def calculate_dosage(weight_kg: float, medicine: str, doses_per_day: int,
                            age_years: Optional[float] = None) -> dict:
    canonical = await resolve_canonical_name(medicine) or medicine
    rule = await dosage_rules_col.find_one(
        {"medicine": {"$regex": f"^{canonical}$", "$options": "i"}}, {"_id": 0}
    )

    warnings = []

    if not rule:
        return {
            "medicine": canonical,
            "per_dose_mg": 0,
            "doses_per_day": doses_per_day,
            "estimated_daily_total_mg": 0,
            "max_daily_mg": 0,
            "within_safe_range": False,
            "warnings": [
                f"No dosage formula on file for '{canonical}'. "
                "This medicine requires a clinician-determined dose."
            ],
        }

    if rule["mode"] == "requires_clinician":
        return {
            "medicine": canonical,
            "per_dose_mg": 0,
            "doses_per_day": doses_per_day,
            "estimated_daily_total_mg": 0,
            "max_daily_mg": rule.get("max_daily_mg") or 0,
            "within_safe_range": False,
            "warnings": [
                f"{canonical} dosing must be individualized by a treating physician "
                "and cannot be safely estimated from weight alone."
            ],
        }

    if age_years is not None and rule.get("min_age_years") and age_years < rule["min_age_years"]:
        warnings.append(
            f"{canonical} is generally not recommended under {rule['min_age_years']} years old "
            "without direct medical supervision."
        )

    if rule["mode"] == "weight_based":
        per_dose = round(weight_kg * rule["mg_per_kg_per_dose"], 1)
        if rule.get("max_mg_per_dose"):
            if per_dose > rule["max_mg_per_dose"]:
                warnings.append(
                    f"Calculated per-dose amount exceeds the typical single-dose cap "
                    f"of {rule['max_mg_per_dose']}mg; capped to the safe maximum."
                )
            per_dose = min(per_dose, rule["max_mg_per_dose"])
    else:  # fixed_adult
        per_dose = rule["fixed_mg_per_dose"]

    daily_total = round(per_dose * doses_per_day, 1)
    max_daily = rule.get("max_daily_mg") or 0
    within_safe_range = daily_total <= max_daily if max_daily else True

    if max_daily and daily_total > max_daily:
        warnings.append(
            f"Estimated daily total ({daily_total}mg) exceeds the maximum "
            f"recommended daily dose ({max_daily}mg). Reduce dose or frequency."
        )

    return {
        "medicine": canonical,
        "per_dose_mg": per_dose,
        "doses_per_day": doses_per_day,
        "estimated_daily_total_mg": daily_total,
        "max_daily_mg": max_daily,
        "within_safe_range": within_safe_range,
        "warnings": warnings,
    }
