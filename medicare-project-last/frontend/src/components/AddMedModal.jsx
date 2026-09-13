import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { useAppState } from "../context/AppStateContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { fmtTime12 } from "../utils/helpers.js";

const MEAL_OPTIONS = ["After food", "Before food", "Anytime"];

export default function AddMedModal({ open, onClose, editingMed }) {
  const { addMedicine, updateMedicine } = useAppState();
  const toast = useToast();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [meal, setMeal] = useState("After food");
  const [times, setTimes] = useState([]);
  const [timeInput, setTimeInput] = useState("");

  useEffect(() => {
    if (open) {
      if (editingMed) {
        setName(editingMed.name);
        setDosage(editingMed.dosage);
        setMeal(editingMed.meal);
        setTimes(editingMed.times.slice());
      } else {
        setName(""); setDosage(""); setMeal("After food"); setTimes([]);
      }
      setTimeInput("");
    }
  }, [open, editingMed]);

  function addTime() {
    if (timeInput && !times.includes(timeInput)) {
      setTimes([...times, timeInput]);
    }
    setTimeInput("");
  }
  function removeTime(t) {
    setTimes(times.filter((x) => x !== t));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !dosage.trim()) { toast("Please fill in all required fields.", "warn"); return; }
    if (times.length === 0) { toast("Add at least one reminder time.", "warn"); return; }

    if (editingMed) updateMedicine(editingMed.id, { name: name.trim(), dosage: dosage.trim(), meal, times });
    else addMedicine({ name: name.trim(), dosage: dosage.trim(), meal, times });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editingMed ? "Edit Medicine" : "Add Medicine"} id="addMedModal">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="medName">Medicine name</label>
          <input type="text" className="input" id="medName" placeholder="e.g. Paracetamol" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="medDosage">Dosage</label>
            <input type="text" className="input" id="medDosage" placeholder="e.g. 500mg, 1 tablet" required value={dosage} onChange={(e) => setDosage(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Meal timing</label>
            <div className="radio-group">
              {MEAL_OPTIONS.map((opt) => (
                <label key={opt} className={`radio-pill${meal === opt ? " checked" : ""}`}>
                  <input type="radio" name="meal" value={opt} checked={meal === opt} onChange={() => setMeal(opt)} />{opt}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="medTimeInput">Reminder times</label>
          <div className="chips-input">
            {times.slice().sort().map((t) => (
              <span className="time-chip" key={t}>
                {fmtTime12(t)}
                <button type="button" aria-label="Remove time" onClick={() => removeTime(t)}>✕</button>
              </span>
            ))}
            <input
              type="time" id="medTimeInput" value={timeInput}
              onChange={(e) => {
                const val = e.target.value;
                if (val && !times.includes(val)) setTimes((prev) => [...prev, val]);
                setTimeInput("");
              }}
            />
          </div>
          <p className="hint">Pick a time and it'll be added as a daily reminder chip. Add as many as you need.</p>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save Medicine</button>
        </div>
      </form>
    </Modal>
  );
}
