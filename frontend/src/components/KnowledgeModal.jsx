import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { api } from "../services/api.js";

export default function KnowledgeModal({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.knowledge.search(query);
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // small debounce so we're not firing a request per keystroke
    return () => clearTimeout(handle);
  }, [query, open]);

  return (
    <Modal open={open} onClose={onClose} title="Medicine Knowledge Base" id="knowledgeModal">
      <div className="form-group">
        <input type="text" className="input" id="kbSearch" placeholder="Search a medicine, e.g. Paracetamol" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 340, overflowY: "auto" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--muted)" }}>Searching...</p>
        ) : results.length ? results.map((k) => (
          <div className="card" style={{ margin: 0, padding: 14 }} key={k.name}>
            <b style={{ fontFamily: "var(--font-display)", color: "var(--primary)" }}>{k.name}</b>
            <p style={{ margin: "6px 0 4px" }}><strong>Use:</strong> {k.use}</p>
            <p style={{ margin: "0 0 4px" }}><strong>Typical dose:</strong> {k.typical_dose}</p>
            <p style={{ margin: 0, color: "var(--warning)" }}><strong>⚠ Caution:</strong> {k.caution}</p>
          </div>
        )) : <p style={{ textAlign: "center", color: "var(--muted)" }}>No results.</p>}
      </div>
    </Modal>
  );
}
