import { useState } from "react";
import Modal from "./Modal.jsx";
import { INTERACTION_MEDS } from "../data/staticData.js";
import { api } from "../services/api.js";

const TONE_BY_SEVERITY = {
  severe: "tone-red",
  moderate: "tone-red",
  mild: "tone-amber",
  none: "tone-green",
  unknown: "tone-blue",
};

export default function InteractionModal({ open, onClose }) {
  const [med1, setMed1] = useState(INTERACTION_MEDS[0]);
  const [med2, setMed2] = useState(INTERACTION_MEDS[1]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function check() {
    if (med1.toLowerCase() === med2.toLowerCase()) {
      setResult({ tone: "tone-amber", text: "Please select two different medicines.", plain: true });
      return;
    }
    setLoading(true);
    try {
      const res = await api.interactions.check({ drug_a: med1, drug_b: med2 });
      setResult({
        tone: TONE_BY_SEVERITY[res.severity] || "tone-blue",
        label: res.severity.toUpperCase(),
        text: `${res.summary} ${res.recommendation}`.trim(),
      });
    } catch (e) {
      setResult({ tone: "tone-amber", text: e.message || "Couldn't check that interaction right now.", plain: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Drug Interaction Checker" id="interactionModal">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="intMed1">Medicine A</label>
          <select className="input" id="intMed1" value={med1} onChange={(e) => setMed1(e.target.value)}>
            {INTERACTION_MEDS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="intMed2">Medicine B</label>
          <select className="input" id="intMed2" value={med2} onChange={(e) => setMed2(e.target.value)}>
            {INTERACTION_MEDS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <button className="btn btn-primary btn-block" onClick={check} type="button" disabled={loading}>
        {loading ? "Checking..." : "Check Interaction"}
      </button>
      <div style={{ marginTop: 14 }}>
        {result && (result.plain ? (
          <div className={`pill-tag ${result.tone}`}>{result.text}</div>
        ) : (
          <div className="card" style={{ margin: 0, padding: 14 }}>
            <span className={`pill-tag ${result.tone}`} style={{ marginBottom: 8 }}>{result.label}</span>
            <p style={{ margin: 0, color: "var(--text)" }}>{result.text}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
