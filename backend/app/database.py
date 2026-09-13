from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client = AsyncIOMotorClient(settings.mongo_uri)
db = client[settings.mongo_db_name]

# Collections
users_col = db["users"]
medicines_col = db["medicines"]          # user's active medicine reminders
history_col = db["dose_history"]         # taken/snoozed/skipped log
knowledge_col = db["medicine_knowledge"] # medicine knowledge base
interactions_col = db["drug_interactions"]
dosage_rules_col = db["dosage_rules"]
scans_col = db["prescription_scans"]
chat_col = db["assistant_chats"]


async def ensure_indexes():
    await users_col.create_index("email", unique=True)
    await medicines_col.create_index("user_id")
    await history_col.create_index([("user_id", 1), ("created_at", -1)])
    await knowledge_col.create_index("name")
    await interactions_col.create_index([("drug_a", 1), ("drug_b", 1)])
    await dosage_rules_col.create_index("medicine")
    await scans_col.create_index("user_id")
    await chat_col.create_index([("user_id", 1), ("created_at", -1)])
