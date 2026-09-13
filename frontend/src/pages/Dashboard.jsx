import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../context/AppStateContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fmtTime12, todayStr } from "../utils/helpers.js";
import AddMedModal from "../components/AddMedModal.jsx";
import SubjectIntegration from "../components/SubjectIntegration.jsx";
import InteractionModal from "../components/InteractionModal.jsx";
import KnowledgeModal from "../components/KnowledgeModal.jsx";
import {
  IconPlus, IconMedicines, IconCheck, IconClock, IconAssistant, IconWarning, IconBook, IconScanner, IconPillAlarm,
} from "../components/Icons.jsx";

export default function Dashboard() {
  const { state } = useAppState();
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);

  const today = todayStr();
  let allSlots = [];
  state.medicines.forEach((med) => med.times.forEach((t) => allSlots.push({ med, time: t })));
  allSlots.sort((a, b) => a.time.localeCompare(b.time));

  const now = new Date();
  const nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  let takenCount = 0, upcomingCount = 0;
  const rows = allSlots.map(({ med, time }) => {
    const key = `${med.id}_${today}_${time}`;
    const r = state.reminders[key];
    let statusTag;
    if (r && r.status === "taken") { takenCount++; statusTag = <span className="pill-tag tone-green">Taken</span>; }
    else if (r && r.status === "skipped-final") { statusTag = <span className="pill-tag tone-red">Skipped</span>; }
    else if (r && r.status === "waiting_response" && r.snoozeCount > 0) { statusTag = <span className="pill-tag tone-amber">Snoozed ×{r.snoozeCount}</span>; }
    else if (time > nowHM) { upcomingCount++; statusTag = <span className="pill-tag tone-blue">Upcoming</span>; }
    else { statusTag = <span className="pill-tag tone-amber">Due</span>; }
    return { med, time, statusTag, key };
  });

  const adherence = allSlots.length ? Math.round((takenCount / allSlots.length) * 100) : 0;

  let insight;
  if (allSlots.length === 0) insight = "Add your medicines to get personalized AI insights on adherence and timing.";
  else if (adherence >= 80) insight = `Great job! You're at ${adherence}% adherence today. Keep taking your medicines on schedule.`;
  else if (upcomingCount > 0) insight = `You have ${upcomingCount} dose(s) coming up today. I'll send an alarm reminder right on time.`;
  else insight = `Your adherence today is ${adherence}%. Try to respond to reminders promptly for the best results.`;

  const firstName = (user?.name || "there").split(" ")[0];

  return (
    <section className="page active">
      <div className="page-head">
        <div>
          <span className="eyebrow">Good to see you</span>
          <h1>Hello, {firstName} 👋</h1>
          <p>Here's your health snapshot for today.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)} type="button">
          <IconPlus /> Add Medicine
        </button>
      </div>

      <div className="grid grid-4" style={{ marginBottom: "var(--sp-3)" }}>
        <div className="card stat-card hoverable">
          <span className="stat-icon tone-blue"><IconMedicines /></span>
          <span className="stat-value">{state.medicines.length}</span>
          <span className="stat-label">Active Medicines</span>
        </div>
        <div className="card stat-card hoverable">
          <span className="stat-icon tone-green"><IconCheck /></span>
          <span className="stat-value">{takenCount}</span>
          <span className="stat-label">Taken Today</span>
          <span className="stat-trend trend-up">{adherence}% adherence</span>
        </div>
        <div className="card stat-card hoverable">
          <span className="stat-icon tone-amber"><IconClock /></span>
          <span className="stat-value">{upcomingCount}</span>
          <span className="stat-label">Upcoming Today</span>
        </div>
        <div className="card stat-card hoverable">
          <span className="stat-icon tone-teal"><IconAssistant /></span>
          <span className="stat-value">AI</span>
          <span className="stat-label">Assistant Online</span>
        </div>
      </div>

      <div className="grid grid-split" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-head">
            <h3>Today's Schedule</h3>
            <span className="pill-tag tone-blue">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
          </div>
          <div>
            {rows.length ? rows.map(({ med, time, statusTag, key }) => (
              <div className="med-row" style={{ marginBottom: 10 }} key={key}>
                <span className="med-icon"><IconPillAlarm /></span>
                <div className="med-info"><b>{med.name}</b><div className="med-meta"><span>{med.dosage}</span><span>{med.meal}</span></div></div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <span className="chip-time">{fmtTime12(time)}</span>{statusTag}
                </div>
              </div>
            )) : (
              <div className="empty-state">
                <IconClock />
                <p>No medicines scheduled yet.</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
          <div className="card" style={{ background: "linear-gradient(135deg,var(--primary),#3B82F6)", color: "#fff", border: "none" }}>
            <div className="card-title-row" style={{ marginBottom: 8 }}>
              <IconAssistant />
              <h3 style={{ color: "#fff", margin: 0 }}>AI Insight</h3>
            </div>
            <p style={{ color: "rgba(255,255,255,0.9)" }}>{insight}</p>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Quick Actions</h3>
            <div className="quick-actions" style={{ flexDirection: "column" }}>
              <button className="quick-action" onClick={() => setInteractionOpen(true)} type="button">
                <span className="stat-icon tone-red" style={{ width: 36, height: 36 }}><IconWarning /></span>
                <b>Interaction Checker</b>
              </button>
              <button className="quick-action" onClick={() => setKbOpen(true)} type="button">
                <span className="stat-icon tone-teal" style={{ width: 36, height: 36 }}><IconBook /></span>
                <b>Medicine Knowledge Base</b>
              </button>
              <Link to="/app/scanner" className="quick-action">
                <span className="stat-icon tone-blue" style={{ width: 36, height: 36 }}><IconScanner /></span>
                <b>Scan a Prescription</b>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <SubjectIntegration />

      <AddMedModal open={addOpen} onClose={() => setAddOpen(false)} editingMed={null} />
      <InteractionModal open={interactionOpen} onClose={() => setInteractionOpen(false)} />
      <KnowledgeModal open={kbOpen} onClose={() => setKbOpen(false)} />
    </section>
  );
}
