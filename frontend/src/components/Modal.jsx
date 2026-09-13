import { useEffect } from "react";
import { IconClose } from "./Icons.jsx";

export default function Modal({ open, onClose, title, children, id }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      className={`modal-backdrop${open ? " open" : ""}`}
      id={id}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="modal-close" aria-label="Close" onClick={onClose} type="button"><IconClose /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
