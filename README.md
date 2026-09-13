# MediCare

An AI-assisted medicine reminder app: a **FastAPI + MongoDB backend** and a
**React (Vite) frontend**, now connected end-to-end. Sign up, add medicines,
get real reminder alarms, scan prescriptions, check drug interactions,
calculate dosages, chat with the AI assistant, and see your adherence reports
— all backed by the real API, not mock data.

```
medicare-project/
├── backend/     FastAPI + MongoDB API
├── frontend/    React + Vite UI
└── README.md    ← you are here
```

## What's connected

| Frontend feature | Backend endpoint(s) |
|---|---|
| Sign up / sign in / sign out | `POST /api/auth/register`, `/login`, `/logout` |
| Session restore on page refresh | `GET /api/auth/me` |
| Add / edit / delete medicines | `POST`, `PATCH`, `DELETE /api/medicines` |
| Reminder Taken / Snoozed / Skipped | `POST /api/medicines/dose-action` |
| Drug Interaction Checker | `POST /api/interactions/check` |
| Medicine Knowledge Base search | `GET /api/knowledge-base/search` |
| Dosage Calculator | `POST /api/dosage/calculate` |
| Prescription Scanner | `POST /api/scanner/upload`, `/confirm` |
| AI Assistant chat | `POST /api/assistant/chat`, `GET /api/assistant/history` |
| Reports & adherence history | `GET /api/reports/adherence`, `/history` |
| Dark mode / alarm sound preferences | `PATCH /api/auth/me/preferences` |

The 10-minute reminder alarm/snooze/skip *scheduling* itself still runs
client-side in the browser (it's a live, on-device timer, not something you'd
round-trip to a server for) — but every action it produces is logged to the
backend, so Reports and adherence stay accurate even if you switch devices.

All of this lives behind one file, `frontend/src/services/api.js`, so there's
a single place that knows how to talk to the backend.

---

## 1. Prerequisites

- **Python 3.10+**
- **Node.js 18+** and npm
- **MongoDB** — either a local install, a local Docker container, or a free
  [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- **Tesseract OCR** binary (only needed if you'll use the Scanner feature) —
  see the backend section below
- (Optional) An LLM API key (Anthropic or OpenAI) for the AI Assistant to
  use a real language model instead of its offline rule-based fallback

## 2. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
```

Open `backend/.env` and fill in:

- `MONGO_URI` — your MongoDB connection string. For a local MongoDB, this is
  usually just `mongodb://localhost:27017` (already the default). For Atlas,
  paste the `mongodb+srv://...` string from your cluster's "Connect" screen.
- `JWT_SECRET` — replace with any long random string (used to sign login
  tokens).
- `FRONTEND_ORIGINS` — already set to `http://localhost:5173` (Vite's default
  dev port), so you shouldn't need to touch this for local development.
- `LLM_API_KEY` — optional. Leave blank and the AI Assistant will use its
  built-in rule-based fallback instead of a real LLM.

**Tesseract OCR** (only needed for the Scanner page — the rest of the app
works fine without it):
```bash
# macOS
brew install tesseract
# Ubuntu/Debian
sudo apt install tesseract-ocr
# Windows: install from https://github.com/UB-Mannheim/tesseract/wiki
#          then set TESSERACT_CMD in .env to the install path
```

**Load the starter clinical data** (medicine knowledge base, drug
interactions, dosage rules) into MongoDB:
```bash
python -m scripts.seed_db
```

**Run the API:**
```bash
uvicorn app.main:app --reload --port 8000
```

You should see it come up at `http://localhost:8000`. Check it's alive:
```bash
curl http://localhost:8000/api/health
# {"status":"ok"}
```
Interactive API docs (Swagger UI): `http://localhost:8000/docs`

## 3. Set up the frontend

Open a **second terminal** (leave the backend running in the first one):

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

`frontend/.env` only needs one value, already set correctly for local use:
```
VITE_API_BASE_URL=http://localhost:8000
```
Change this only if your backend runs somewhere other than `localhost:8000`.

Open the URL Vite prints (usually `http://localhost:5173`). Create an
account on the Sign Up page — that's a real account stored in your MongoDB
now, not a demo/local one.

## 4. Using it

1. **Sign up**, then **Add Medicine** from the Dashboard — pick one or more
   reminder times.
2. When a reminder time arrives, an in-app alarm modal appears with
   Taken / Snooze / Skip — try it (there's a "Test Mode" in the reminder
   engine that speeds up the interval to 15 seconds for faster testing;
   see `frontend/src/context/AppStateContext.jsx`'s `testMode` if you want to
   enable it from the console for a quick demo).
3. Check **Reports** afterward — the history there is pulled live from
   MongoDB via `/api/reports/history`.
4. Try **Dosage Calculator**, **Interaction Checker** (Dashboard → Quick
   Actions), **Knowledge Base** search, and the **AI Assistant** chat — all
   hitting the real backend.
5. Try **Scanner** with a photo of any prescription-like text (clear,
   printed text works best with Tesseract) to see OCR extraction end-to-end.

## 5. Troubleshooting

- **Frontend shows "Can't reach the MediCare server"** — make sure the
  backend is running (`uvicorn app.main:app --reload --port 8000`) and that
  `VITE_API_BASE_URL` in `frontend/.env` matches where it's running.
- **CORS errors in the browser console** — make sure
  `backend/.env`'s `FRONTEND_ORIGINS` includes the exact origin shown in your
  browser's address bar (including port). It defaults to `5173`, which is
  Vite's default port; only edit it if Vite picks a different port (Vite
  will print whichever port it actually used when you run `npm run dev`).
- **401 errors right after signing in** — usually a stale/expired token from
  a previous session; sign out and back in, or clear your browser's local
  storage for the site.
- **MongoDB connection errors on backend startup** — double check
  `MONGO_URI` in `backend/.env`, and that your IP is allow-listed if you're
  using Atlas (Atlas → Network Access).
- **Scanner returns no detected medicines** — confirm Tesseract is installed
  and on your `PATH` (or `TESSERACT_CMD` is set), and try a clearer, more
  legible photo.

## 6. Project structure

```
backend/
  app/
    auth/            registration, login, JWT, preferences
    routes/          medicines, interactions, knowledge-base, dosage,
                      scanner, assistant, reports
    services/        interaction_engine, knowledge_service, dosage_engine,
                      ocr_service, assistant_service
    models/          Pydantic request/response schemas
    data/            seed JSON for knowledge base / interactions / dosage rules
  scripts/seed_db.py loads the seed JSON into MongoDB
  README.md          backend-specific details (architecture rationale, etc.)

frontend/
  src/
    services/api.js  the one place that talks to the backend
    context/         AuthContext, AppStateContext (medicines + reminder engine)
    pages/           Dashboard, Medicines, Scanner, Dosage, Assistant, Reports, Profile...
    components/      modals, navbar, reminder alarm, icons
  README.md          frontend-specific details
```
