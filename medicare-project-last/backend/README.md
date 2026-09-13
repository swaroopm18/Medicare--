# MediCare Backend

FastAPI (Python) backend for the MediCare AI Health Companion frontend, using
MongoDB Atlas for storage. Built to match every screen in the reference UI:
Dashboard, Scanner, Medicines, Dosage Calc, AI Assistant, Reports, and
Profile & Settings, plus JWT-based login/register/logout.

## Why this architecture for the "AI" pieces

A note on scope, upfront: true custom-trained ML models for drug interactions
or dosing from a handful of examples would be both infeasible to build in one
pass and genuinely unsafe (a model can "hallucinate" an interaction or dose
that doesn't exist). So each AI-labeled feature is built the way real clinical
software actually does it:

| Feature | Approach | File |
|---|---|---|
| Drug Interaction Checker | Curated, symmetric rule-based lookup table in MongoDB (starter set included, designed to scale to a full DrugBank/openFDA import later) | `app/services/interaction_engine.py` |
| Medicine Knowledge Base | Structured MongoDB collection + fuzzy alias matching (rapidfuzz) so "dolo650" resolves to Paracetamol, etc. | `app/services/knowledge_service.py` |
| Dosage Calculator | Formula-based (mg/kg with hard safety caps), rules stored in Mongo so a clinical reviewer can add more drugs without redeploying code | `app/services/dosage_engine.py` |
| Prescription Scanner | OCR (Tesseract for images, PyMuPDF + OCR fallback for PDFs) -> regex/heuristic field extraction -> fuzzy match against the Knowledge Base | `app/services/ocr_service.py` |
| AI Assistant | Real LLM call (Anthropic/OpenAI, pluggable) grounded in the user's own schedule + the KB/interaction data, with a deterministic rule-based fallback if no API key is configured | `app/services/assistant_service.py` |

This means the app is fully functional and demo-able with **zero external API
keys** (rule-based fallbacks everywhere), and gets smarter/more conversational
the moment you add an `LLM_API_KEY`.

## Setup

```bash
cd medicare-backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: paste your MongoDB Atlas connection string, a JWT secret,
# your frontend origin(s), and (optionally) an LLM_API_KEY

# Tesseract OCR must be installed on the machine (not a pip package):
#   Mac:    brew install tesseract
#   Ubuntu: sudo apt install tesseract-ocr
#   Windows: install from https://github.com/UB-Mannheim/tesseract/wiki
#            then set TESSERACT_CMD in .env to the install path

# Load the starter knowledge base / interactions / dosage rules into MongoDB:
python -m scripts.seed_db

# Run the API:
uvicorn app.main:app --reload --port 8000
```

API docs (Swagger UI): http://localhost:8000/docs

## Frontend integration

The frontend should call:

- `POST /api/auth/register`, `POST /api/auth/login` -> store `access_token`,
  send as `Authorization: Bearer <token>` on every other call.
- `POST /api/auth/logout` -> clear the token client-side (JWTs are stateless).
- `GET /api/medicines`, `POST /api/medicines`, `PATCH /api/medicines/{id}`,
  `DELETE /api/medicines/{id}` -> the Medicines page + dashboard schedule.
- `POST /api/medicines/dose-action` -> Taken/Snoozed/Skipped buttons.
- `GET /api/medicines/dashboard-summary` -> the 4 stat cards + AI Insight
  banner on Dashboard.
- `POST /api/interactions/check` -> Interaction Checker modal.
- `GET /api/knowledge-base/search?q=` -> Medicine Knowledge Base modal.
- `POST /api/dosage/calculate` -> Dosage Calculator page.
- `POST /api/scanner/upload` (multipart file) then
  `POST /api/scanner/confirm` -> Scanner page's "Confirm & Add to Reminders".
- `POST /api/assistant/chat`, `GET /api/assistant/history` -> AI Assistant chat.
- `GET /api/reports/adherence`, `GET /api/reports/history` -> Reports page.
- `GET /api/auth/me`, `PATCH /api/auth/me/preferences` -> Profile & Settings
  (Dark Mode / Alarm Sound / Push Notifications toggles).

## Expanding the clinical data

All three "AI" data sources are plain MongoDB collections seeded from JSON in
`app/data/`. To grow real coverage:
- Add more entries to `medicine_kb.json` / `drug_interactions.json` /
  `dosage_rules.json` and re-run `python -m scripts.seed_db` (it upserts, so
  it won't duplicate existing entries), **or**
- Import a licensed dataset (DrugBank, RxNorm, openFDA NDC/label data) into
  the same three collections directly \u2014 the app code doesn't need to change,
  since it only depends on the collection schema, not the seed files.

## Important

This is a demo/educational health-companion app. It is explicitly **not** a
substitute for professional medical advice \u2014 that disclaimer is baked into
the dosage calculator, interaction checker, and assistant responses, and
should stay there in any deployment.
