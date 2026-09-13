import { Link } from "react-router-dom";
import PublicNavbar from "../components/PublicNavbar.jsx";
import {
  IconScanner, IconMedicines, IconDosage, IconAssistant, IconReports, IconShield,
  IconCheck, IconClock, IconMeal, IconArrowRight, IconPillAlarm,
} from "../components/Icons.jsx";

const FEATURES = [
  { Icon: IconScanner, tone: "tone-blue", title: "AI Prescription Scanner", text: "Snap a photo of any prescription and let AI extract medicine names, dosage and frequency in seconds." },
  { Icon: IconMedicines, tone: "tone-teal", title: "Smart Medicine Reminders", text: "Never miss a dose — MediCare rings an alarm at the exact time, with snooze and skip built in." },
  { Icon: IconDosage, tone: "tone-amber", title: "Dosage Calculator", text: "Estimate a safe dosage range from patient weight and medicine strength before you administer." },
  { Icon: IconAssistant, tone: "tone-green", title: "AI Health Assistant", text: "Ask about schedules, interactions or missed doses and get instant, plain-language guidance." },
  { Icon: IconShield, tone: "tone-red", title: "Interaction Checker", text: "Check two medicines against each other for known interactions before you combine them." },
  { Icon: IconReports, tone: "tone-blue", title: "Adherence Reports", text: "Track taken, snoozed and skipped doses over time with clear, visual analytics." },
];

const STEPS = [
  { title: "Create your account", text: "Sign up in seconds — no paperwork, just your name, email and a password." },
  { title: "Add or scan your medicines", text: "Type them in manually or scan a prescription and let AI fill in the details." },
  { title: "Get reminded, stay on track", text: "MediCare rings right on time and keeps a log of everything you take." },
];

export default function Home() {
  return (
    <div className="app">
      <PublicNavbar />
      <main>
        <div className="container">
          <section className="hero-section">
            <div className="hero-copy">
              <span className="eyebrow">AI Health Companion</span>
              <h1>Your medicines, on time, every time.</h1>
              <p className="hero-sub">
                MediCare scans prescriptions, calculates safe dosages, and rings a real reminder alarm
                so you never miss another dose — with an AI assistant on hand for quick health questions.
              </p>
              <div className="hero-cta-row">
                <Link to="/signup" className="btn btn-primary">
                  Get Started Free <IconArrowRight />
                </Link>
                <Link to="/signin" className="btn btn-secondary">Sign In</Link>
              </div>
              <div className="hero-trust-row">
                <div className="hero-trust-item"><b>10 min</b><span>Reminder precision</span></div>
                <div className="hero-trust-item"><b>AI</b><span>Prescription scanning</span></div>
                <div className="hero-trust-item"><b>Free</b><span>To get started</span></div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-visual-card">
                <div className="card-title-row" style={{ marginBottom: 10 }}>
                  <span className="stat-icon tone-blue"><IconAssistant /></span>
                  <h3 style={{ margin: 0, fontSize: 15 }}>Today's Schedule</h3>
                </div>
                <div className="med-row" style={{ marginBottom: 8 }}>
                  <span className="med-icon"><IconPillAlarm /></span>
                  <div className="med-info"><b>Paracetamol</b><div className="med-meta"><span>500mg</span><span>After food</span></div></div>
                  <span className="chip-time">9:00 AM</span>
                </div>
                <div className="med-row" style={{ margin: 0 }}>
                  <span className="med-icon"><IconPillAlarm /></span>
                  <div className="med-info"><b>Amoxicillin</b><div className="med-meta"><span>250mg</span><span>Before food</span></div></div>
                  <span className="chip-time">2:00 PM</span>
                </div>
              </div>
              <div className="hero-floating-badge badge-1"><IconCheck /> 92% adherence</div>
              <div className="hero-floating-badge badge-2"><IconClock /> Reminder in 10m</div>
            </div>
          </section>

          <section id="features" style={{ padding: "var(--sp-6) 0" }}>
            <div className="section-head">
              <span className="eyebrow">What's inside</span>
              <h2>Everything you need to stay on schedule</h2>
              <p>One dashboard for prescriptions, reminders, dosage guidance and adherence tracking.</p>
            </div>
            <div className="grid grid-3">
              {FEATURES.map((f) => (
                <div className="card feature-card hoverable" key={f.title}>
                  <span className={`stat-icon ${f.tone}`}><f.Icon /></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="how-it-works" className="grid grid-split" style={{ padding: "var(--sp-4) 0 var(--sp-6)", alignItems: "center" }}>
            <div>
              <span className="eyebrow">How it works</span>
              <h2 style={{ marginBottom: 18 }}>Three steps to better adherence</h2>
              <div className="steps-row">
                {STEPS.map((s, i) => (
                  <div className="step-item" key={s.title}>
                    <span className="step-num">{i + 1}</span>
                    <div><b>{s.title}</b><p style={{ margin: "2px 0 0" }}>{s.text}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ background: "linear-gradient(135deg,var(--primary),#3B82F6)", color: "#fff", border: "none" }}>
              <div className="card-title-row" style={{ marginBottom: 8 }}>
                <IconAssistant />
                <h3 style={{ color: "#fff", margin: 0 }}>AI Insight, built in</h3>
              </div>
              <p style={{ color: "rgba(255,255,255,0.9)" }}>
                MediCare's assistant reads your schedule and adherence in real time, so the guidance you get is
                always about your medicines — not generic advice.
              </p>
            </div>
          </section>

          <section className="cta-band">
            <h2>Ready to stay on top of your medicines?</h2>
            <p>Create your free MediCare account and add your first reminder in under a minute.</p>
            <Link to="/signup" className="btn btn-secondary">Create your account</Link>
          </section>
        </div>
      </main>
      <footer className="site-footer">
        <div className="container">MediCare © 2026 — AI-powered healthcare companion. Not a substitute for professional medical advice.</div>
      </footer>
    </div>
  );
}
