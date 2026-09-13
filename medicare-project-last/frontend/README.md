# MediCare — Frontend (React + Vite)

This is the frontend-only stage of the MediCare MERN conversion, built from your
original `medicare-app.html`. No visual feature, color, or layout was changed —
the existing design system (colors, fonts, spacing, component styles) was copied
over as-is. Three new pages were added in the same style: **Home**, **Sign In**,
and **Sign Up**.

## What's included
- `/` — Home: public landing page describing MediCare, with Sign In / Get Started CTAs
- `/signin` — Sign In
- `/signup` — Sign Up
- `/app/dashboard` — Dashboard (now includes a "Where Your Coursework Shows Up"
  section blending the R23 syllabus mapping into the existing card system)
- `/app/scanner`, `/app/medicines`, `/app/dosage`, `/app/assistant`,
  `/app/reports`, `/app/profile` — the original app, ported 1:1 into React
  components, routed and protected behind sign-in

Auth, medicines, dose logging, dosage calculation, interaction checking, the
knowledge base, prescription scanning, the AI assistant, and reports are all
now wired to the real FastAPI backend in `../backend` — nothing here is a
localStorage stub anymore. Copy `.env.example` to `.env` and point
`VITE_API_BASE_URL` at your running backend (defaults to
`http://localhost:8000`) before running the dev server.

## Run it locally
```bash
cp .env.example .env   # adjust VITE_API_BASE_URL if your backend isn't on :8000
npm install
npm run dev
```
Then open the printed local URL (usually http://localhost:5173). Make sure
the backend (`../backend`) is running first, or requests will fail.

## Build for production
```bash
npm run build
npm run preview
```

## Project structure
```
src/
  context/       AuthContext, AppStateContext (medicines/reminders engine), ToastContext
  services/      api.js — the single place that talks to the backend
  components/    Navbar, Drawer, modals, ReminderModal (alarm), icons, PublicNavbar
  layouts/       AppLayout (navbar + drawer + footer + reminder modal wrapper)
  pages/         Home, SignIn, SignUp, Dashboard, Scanner, Medicines, Dosage,
                 Assistant, Reports, Profile
  data/          static reference data (popular meds list, R23 subject mapping)
  utils/         helpers (time formatting, scheduling math)
```

## Notes
- The medicine reminder *scheduling* (the 10-minute alarm/snooze/skip cycle)
  still runs client-side — that's a live, on-device feature, not something a
  request/response API is well suited for. Every dose action it produces
  (taken/snoozed/skipped) is still logged to the backend so Reports stays
  accurate across sessions and devices.
- See `../README.md` at the project root for how to run backend + frontend
  together.
