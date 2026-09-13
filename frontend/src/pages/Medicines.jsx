import { useState } from "react";
import { useAppState } from "../context/AppStateContext.jsx";
import { fmtTime12 } from "../utils/helpers.js";
import AddMedModal from "../components/AddMedModal.jsx";
import { IconPlus, IconPillAlarm, IconMedicines, IconMeal, IconEdit, IconTrash } from "../components/Icons.jsx";

export default function Medicines() {
  const { state, deleteMedicine } = useAppState();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);

  function openAdd() { setEditingMed(null); setModalOpen(true); }
  function openEdit(med) { setEditingMed(med); setModalOpen(true); }
  function handleDelete(id) {
    if (window.confirm("Remove this medicine and its reminders?")) deleteMedicine(id);
  }

  return (
    <section className="page active">
      <div className="page-head">
        <div><span className="eyebrow">Medicine Reminder</span><h1>Your Medicines</h1><p>Manage medicines, dosage timing and reminder schedules.</p></div>
        <button className="btn btn-primary" onClick={openAdd} type="button"><IconPlus /> Add Medicine</button>
      </div>
      <div className="card">
        {state.medicines.length === 0 ? (
          <div className="empty-state">
            <IconMedicines />
            <p>No medicines yet. Add your first medicine to start getting reminders.</p>
            <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={openAdd} type="button">Add Medicine</button>
          </div>
        ) : (
          state.medicines.map((med) => (
            <div className="med-row" key={med.id}>
              <span className="med-icon"><IconPillAlarm /></span>
              <div className="med-info">
                <b>{med.name}</b>
                <div className="med-meta">
                  <span><IconMedicines />{med.dosage}</span>
                  <span><IconMeal />{med.meal}</span>
                </div>
                <div className="med-meta" style={{ marginTop: 6 }}>
                  {med.times.slice().sort().map((t) => <span className="chip-time" key={t}>{fmtTime12(t)}</span>)}
                </div>
              </div>
              <div className="med-actions">
                <button className="icon-btn" style={{ width: 38, height: 38 }} title="Edit" onClick={() => openEdit(med)} type="button"><IconEdit /></button>
                <button className="icon-btn" style={{ width: 38, height: 38, color: "var(--danger)" }} title="Delete" onClick={() => handleDelete(med.id)} type="button"><IconTrash /></button>
              </div>
            </div>
          ))
        )}
      </div>
      <AddMedModal open={modalOpen} onClose={() => setModalOpen(false)} editingMed={editingMed} />
    </section>
  );
}
