import { NavLink, useNavigate } from "react-router-dom";
import { useAppState } from "../context/AppStateContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  IconLogo, IconDashboard, IconScanner, IconMedicines, IconDosage, IconAssistant,
  IconReports, IconProfileCircle, IconLogout, IconClose,
} from "./Icons.jsx";

const NAV_ITEMS = [
  { to: "/app/dashboard", label: "Dashboard", Icon: IconDashboard },
  { to: "/app/scanner", label: "Prescription Scanner", Icon: IconScanner },
  { to: "/app/medicines", label: "Medicines", Icon: IconMedicines },
  { to: "/app/dosage", label: "Dosage Calculator", Icon: IconDosage },
  { to: "/app/assistant", label: "AI Assistant", Icon: IconAssistant },
  { to: "/app/reports", label: "Reports", Icon: IconReports },
];

export default function Drawer({ open, onClose }) {
  const { toggleDarkMode } = useAppState();
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  return (
    <>
      <div className={`drawer-backdrop${open ? " open" : ""}`} onClick={onClose}></div>
      <aside className={`drawer${open ? " open" : ""}`} aria-label="Mobile navigation">
        <div className="drawer-head">
          <div className="brand">
            <span className="brand-icon"><IconLogo width={20} height={20} /></span>
            <span className="brand-text"><b>MediCare</b></span>
          </div>
          <button className="drawer-close" aria-label="Close menu" onClick={onClose} type="button"><IconClose /></button>
        </div>
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `drawer-link${isActive ? " active" : ""}`}>
            <Icon />{label}
          </NavLink>
        ))}
        <div className="drawer-sep"></div>
        <NavLink to="/app/profile" onClick={onClose} className={({ isActive }) => `drawer-link${isActive ? " active" : ""}`}>
          <IconProfileCircle />Profile
        </NavLink>
        <button className="drawer-link" style={{ border: "none", background: "none", width: "100%", textAlign: "left" }} onClick={toggleDarkMode} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" /></svg>Toggle Dark Mode
        </button>
        <button
          className="drawer-link" style={{ border: "none", background: "none", width: "100%", textAlign: "left", color: "var(--danger)" }}
          onClick={() => { onClose(); logout(); toast("You've been logged out.", "success"); navigate("/"); }}
          type="button"
        >
          <IconLogout />Logout
        </button>
      </aside>
    </>
  );
}
