import { useState } from "react";
import { useToast } from "../context/ToastContext.jsx";
import { DOSAGE_MEDICINES } from "../data/staticData.js";
import { IconDosage } from "../components/Icons.jsx";
import { api } from "../services/api.js";

export default function Dosage() {
  const [weight, setWeight] = useState("");
  const [medValue, setMedValue] = useState(DOSAGE_MEDICINES[0].value);
  const [freq, setFreq] = useState(3);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function calculate() {
    const w = parseFloat(weight);
    if (!w || w <= 0) { toast("Enter a valid weight to calculate dosage.", "warn"); return; }
    const med = DOSAGE_MEDICINES.find((m) => m.value === medValue);
    setLoading(true);
    try {
      const res = await api.dosage.calculate({
        weight_kg: w,
        medicine: med.label,
        doses_per_day: freq,
      });
      setResult({
        label: res.medicine,
        perDose: res.per_dose_mg,
        freq: res.doses_per_day,
        dailyDose: res.estimated_daily_total_mg,
        max: res.max_daily_mg,
        withinSafeRange: res.within_safe_range,
        warnings: res.warnings || [],
      });
      if (res.warnings?.length) {
        res.warnings.forEach((w) => toast(w, "warn"));
      }
    } catch (e) {
      toast(e.message || "Couldn't calculate dosage right now.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page active">
      <div className="page-head">
        <div><span className="eyebrow">AI Dosage Calculator</span><h1>Dosage Calculator</h1><p>Estimate a safe dosage range based on weight and medicine strength. Always confirm with your doctor.</p></div>
      </div>
      <div className="grid grid-split">
        <div className="card">
          <div className="form-group">
            <label htmlFor="dcWeight">Patient weight (kg)</label>
            <input type="number" className="input" id="dcWeight" placeholder="e.g. 68" min="1" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dcMedicine">Medicine</label>
              <select className="input" id="dcMedicine" value={medValue} onChange={(e) => setMedValue(e.target.value)}>
                {DOSAGE_MEDICINES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="dcFrequency">Doses per day</label>
              <select className="input" id="dcFrequency" value={freq} onChange={(e) => setFreq(parseInt(e.target.value, 10))}>
                <option value="1">Once daily</option>
                <option value="2">Twice daily</option>
                <option value="3">Three times daily</option>
                <option value="4">Four times daily</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-block" onClick={calculate} type="button" disabled={loading}>
            <IconDosage /> {loading ? "Calculating..." : "Calculate Dosage"}
          </button>
          <p className="hint" style={{ marginTop: 12 }}>⚠️ This is a general estimate for educational purposes only and does not replace professional medical advice.</p>
        </div>
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          {result ? (
            <>
              <span className="eyebrow">{result.label}</span>
              <div className="stat-value" style={{ fontSize: 40, margin: "6px 0" }}>{result.perDose} mg</div>
              <p>per dose, {result.freq}× daily</p>
              <div className={`pill-tag ${result.withinSafeRange ? "tone-blue" : "tone-red"}`} style={{ marginTop: 10 }}>Estimated daily total: {result.dailyDose} mg (max {result.max} mg)</div>
              <p className="hint" style={{ marginTop: 14 }}>⚠️ Estimate only — always confirm with a licensed clinician before administering.</p>
            </>
          ) : (
            <>
              <span className="stat-icon tone-teal" style={{ width: 56, height: 56, marginBottom: 12 }}><IconDosage /></span>
              <p>Enter patient details to see the calculated dosage here.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
