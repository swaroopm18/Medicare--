import { useEffect, useState } from "react";
import { fmtTime12 } from "../utils/helpers.js";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../services/api.js";
import { IconCheck, IconClock, IconClose, IconRecords } from "../components/Icons.jsx";

export default function Reports() {
  const [summary, setSummary] = useState({ taken: 0, snoozed: 0, skipped: 0 });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [adherence, history] = await Promise.all([
          api.reports.adherence(),
          api.reports.history(25),
        ]);
        if (cancelled) return;
        setSummary(adherence);
        setRows(history);
      } catch (e) {
        if (!cancelled) toast(e.message || "Couldn't load your reports.", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { taken, snoozed, skipped } = summary;
  const total = taken + skipped + snoozed || 1;

  const bars = [
    { label: "Taken", val: taken, color: "var(--success)" },
    { label: "Snoozed", val: snoozed, color: "var(--warning)" },
    { label: "Skipped", val: skipped, color: "var(--danger)" },
  ];

  return (
    <section className="page active">
      <div className="page-head">
        <div><span className="eyebrow">Reports &amp; Analytics</span><h1>Your Health Analytics</h1><p>Track adherence trends and dose history over time.</p></div>
      </div>
      <div className="grid grid-split">
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Adherence Breakdown</h3>
          <div>
            {bars.map((b) => (
              <div className="bar-row" key={b.label}>
                <span className="bar-label">{b.label}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round((b.val / total) * 100)}%`, background: b.color }}></div></div>
                <span className="bar-val">{b.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 6 }}>Summary</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
            <div className="med-row" style={{ margin: 0 }}><span className="med-icon tone-green"><IconCheck /></span><div className="med-info"><b>{taken}</b><span style={{ fontSize: 12.5, color: "var(--muted)" }}>Doses Taken</span></div></div>
            <div className="med-row" style={{ margin: 0 }}><span className="med-icon tone-amber"><IconClock /></span><div className="med-info"><b>{snoozed}</b><span style={{ fontSize: 12.5, color: "var(--muted)" }}>Snoozed</span></div></div>
            <div className="med-row" style={{ margin: 0 }}><span className="med-icon tone-red"><IconClose /></span><div className="med-info"><b>{skipped}</b><span style={{ fontSize: 12.5, color: "var(--muted)" }}>Skipped</span></div></div>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginTop: "var(--sp-3)" }}>
        <h3 style={{ marginBottom: 12 }}>Recent History</h3>
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--muted)" }}>Loading...</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Medicine</th><th>Scheduled</th><th>Action</th><th>Time</th></tr></thead>
                <tbody>
                  {rows.map((h, i) => {
                    const cls = h.action === "taken" ? "tone-green" : h.action === "skipped" ? "tone-red" : "tone-amber";
                    return (
                      <tr key={i}>
                        <td>{h.medicine}</td>
                        <td>{fmtTime12(h.scheduled)}</td>
                        <td><span className={`status-badge ${cls}`}>{h.action}</span></td>
                        <td>{new Date(h.time).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && (
              <div className="empty-state">
                <IconRecords />
                <p>No history yet. Reminders you respond to will show up here.</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
