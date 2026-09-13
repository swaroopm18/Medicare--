"""
One-time (or repeatable) seed script that loads the JSON knowledge files
in app/data/ into MongoDB Atlas. Safe to re-run - it upserts by name/pair
instead of blindly inserting duplicates.

Usage:
    python -m scripts.seed_db
"""
import asyncio
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import knowledge_col, interactions_col, dosage_rules_col, ensure_indexes

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app", "data")


async def seed_knowledge_base():
    with open(os.path.join(DATA_DIR, "medicine_kb.json")) as f:
        docs = json.load(f)
    for doc in docs:
        await knowledge_col.update_one({"name": doc["name"]}, {"$set": doc}, upsert=True)
    print(f"Seeded {len(docs)} medicine knowledge base entries.")


async def seed_interactions():
    with open(os.path.join(DATA_DIR, "drug_interactions.json")) as f:
        docs = json.load(f)
    for doc in docs:
        await interactions_col.update_one(
            {"drug_a": doc["drug_a"], "drug_b": doc["drug_b"]}, {"$set": doc}, upsert=True
        )
    print(f"Seeded {len(docs)} drug interaction entries.")


async def seed_dosage_rules():
    with open(os.path.join(DATA_DIR, "dosage_rules.json")) as f:
        docs = json.load(f)
    for doc in docs:
        await dosage_rules_col.update_one({"medicine": doc["medicine"]}, {"$set": doc}, upsert=True)
    print(f"Seeded {len(docs)} dosage rule entries.")


async def main():
    await ensure_indexes()
    await seed_knowledge_base()
    await seed_interactions()
    await seed_dosage_rules()
    print("Seeding complete.")


if __name__ == "__main__":
    asyncio.run(main())
