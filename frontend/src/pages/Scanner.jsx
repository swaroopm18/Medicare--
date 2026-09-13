import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../context/AppStateContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../services/api.js";
import { IconUpload, IconPillAlarm, IconCheck } from "../components/Icons.jsx";

const STEPS = ["Uploading image…", "Running OCR…", "Identifying medicines…", "Matching knowledge base…", "Finalizing…"];

// The backend hands back a friendly "09:00 AM" suggestion; the rest of the
// app (reminder scheduler, <input type="time">) works in 24-hour "HH:MM".
function to24Hour(label) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((label || "").trim());
  if (!m) return "09:00";
  let [, h, min, ampm] = m;
  h = parseInt(h, 10);
  if (/PM/i.test(ampm) && h !== 12) h += 12;
  if (/AM/i.test(ampm) && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

export default function Scanner() {
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [statusText, setStatusText] = useState(STEPS[0]);
  const [pct, setPct] = useState(0);
  const [scan, setScan] = useState(null); // { scanId, filename, medicines: [...] }
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const { refreshMedicines } = useAppState();
  const toast = useToast();
  const navigate = useNavigate();

  async function runScan(file) {
    setScan(null);
    setScanning(true);
    setPct(0);
    let i = 0, p = 0;
    setStatusText(STEPS[0]);
    const timer = setInterval(() => {
      p += 6 + Math.random() * 8;
      if (p > (i + 1) * (100 / STEPS.length) && p < 96) { i = Math.min(i + 1, STEPS.length - 1); setStatusText(STEPS[i]); }
      setPct(Math.min(p, 96));
    }, 220);

    try {
      const res = await api.scanner.upload(file);
      clearInterval(timer);
      setPct(100);
      setScanning(false);
      setScan({
        scanId: res.scan_id,
        filename: res.filename,
        medicines: res.extracted_medicines.map((m) => ({
          selected: true,
          name: m.matched_kb_name || m.name,
          dosage: m.dosage || "",
          meal: m.meal_timing || "After food",
          time: to24Hour(m.suggested_time),
          frequency_per_day: 1,
          confidence: m.confidence,
        })),
      });
      if (!res.extracted_medicines.length) {
        toast("Couldn't detect any medicines on that prescription — try a clearer photo.", "warn");
      }
    } catch (e) {
      clearInterval(timer);
      setScanning(false);
      toast(e.message || "Couldn't scan that file.", "error");
    }
  }

  function toggleSelected(idx) {
    setScan((s) => ({ ...s, medicines: s.medicines.map((m, i) => (i === idx ? { ...m, selected: !m.selected } : m)) }));
  }
  function updateField(idx, field, value) {
    setScan((s) => ({ ...s, medicines: s.medicines.map((m, i) => (i === idx ? { ...m, [field]: value } : m)) }));
  }

  async function confirmAdd() {
    const chosen = scan.medicines.filter((m) => m.selected);
    if (!chosen.length) { toast("Select at least one medicine to add.", "warn"); return; }
    setSubmitting(true);
    try {
      await api.scanner.confirm({
        scan_id: scan.scanId,
        medicines: chosen.map((m) => ({
          name: m.name,
          dosage_amount: m.dosage,
          meal_timing: m.meal,
          time: m.time,
          frequency_per_day: m.frequency_per_day,
        })),
      });
      await refreshMedicines();
      toast("Medicines added from scanned prescription!", "success");
      navigate("/app/medicines");
    } catch (e) {
      toast(e.message || "Couldn't add those medicines.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page active">
      <div className="page-head">
        <div><span className="eyebrow">AI Prescription Scanner</span><h1>Scan &amp; Digitize Prescriptions</h1><p>Upload a photo of your prescription — our AI extracts medicine names, dosages and schedules.</p></div>
      </div>
      <div className="grid grid-split">
        <div className="card">
          <div
            className={`dropzone${dragging ? " drag" : ""}`} tabIndex={0} role="button" aria-label="Upload prescription image"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) runScan(e.dataTransfer.files[0]); }}
          >
            <IconUpload />
            <h3 style={{ marginBottom: 4 }}>Drag & drop your prescription</h3>
            <p>or click to browse — JPG, PNG, PDF up to 10MB</p>
            <input
              type="file" ref={fileInputRef} accept="image/*,.pdf" className="sr-only"
              onChange={(e) => { if (e.target.files.length) runScan(e.target.files[0]); }}
            />
          </div>
          {scanning && (
            <div style={{ marginTop: "var(--sp-2)" }}>
              <p style={{ marginBottom: 6, fontWeight: 600, color: "var(--text)" }}>{statusText}</p>
              <div className="scan-progress"><div className="scan-progress-fill" style={{ width: `${pct}%` }}></div></div>
            </div>
          )}
          {scan && (
            <div style={{ marginTop: "var(--sp-3)" }}>
              <div className="card" style={{ background: "var(--success-light)", borderColor: "var(--success)" }}>
                <div className="card-title-row" style={{ marginBottom: 10 }}>
                  <span style={{ color: "var(--success)" }}><IconCheck /></span>
                  <h3 style={{ margin: 0, color: "var(--success)", fontSize: 16 }}>Scan complete — "{scan.filename}"</h3>
                </div>
                <p style={{ marginBottom: 12 }}>Detected medicines (AI extraction, please confirm before adding):</p>
                {scan.medicines.length === 0 ? (
                  <p className="hint">No medicines detected — try uploading a clearer photo.</p>
                ) : scan.medicines.map((m, idx) => (
                  <div className="med-row" style={{ margin: "0 0 14px", alignItems: "center" }} key={idx}>
                    <input type="checkbox" checked={m.selected} onChange={() => toggleSelected(idx)} style={{ marginRight: 10 }} />
                    <span className="med-icon"><IconPillAlarm /></span>
                    <div className="med-info" style={{ flex: 1 }}>
                      <b>{m.name}</b>
                      <div className="med-meta">
                        <span>{m.dosage}</span>
                        <span>{m.meal}</span>
                        <input
                          type="time" className="input" style={{ width: 120, display: "inline-block", marginLeft: 6 }}
                          value={m.time} onChange={(e) => updateField(idx, "time", e.target.value)}
                        />
                      </div>
                      {m.confidence < 0.6 && <p className="hint" style={{ margin: "4px 0 0" }}>⚠️ Low-confidence match — please double-check before adding.</p>}
                    </div>
                  </div>
                ))}
                {scan.medicines.length > 0 && (
                  <button className="btn btn-primary btn-block" onClick={confirmAdd} type="button" disabled={submitting}>
                    {submitting ? "Adding..." : "Confirm & Add to Reminders"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <h3>How it works</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 10 }}>
            <div style={{ display: "flex", gap: 12 }}><span className="stat-icon tone-blue" style={{ width: 32, height: 32, flexShrink: 0 }}>1</span><div><b>Upload</b><p style={{ margin: 0 }}>Snap a clear photo of your prescription.</p></div></div>
            <div style={{ display: "flex", gap: 12 }}><span className="stat-icon tone-teal" style={{ width: 32, height: 32, flexShrink: 0 }}>2</span><div><b>AI Extraction</b><p style={{ margin: 0 }}>We detect medicine names, dosage and frequency.</p></div></div>
            <div style={{ display: "flex", gap: 12 }}><span className="stat-icon tone-green" style={{ width: 32, height: 32, flexShrink: 0 }}>3</span><div><b>Confirm & Add</b><p style={{ margin: 0 }}>Review details, then add reminders instantly.</p></div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
