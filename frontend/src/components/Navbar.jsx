import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAppState } from "../context/AppStateContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { fmtTime12 } from "../utils/helpers.js";
import { POPULAR_MEDS } from "../data/staticData.js";
import {
  IconLogo, IconDashboard, IconScanner, IconMedicines, IconDosage, IconAssistant,
  IconReports, IconSearch, IconMic, IconBell, IconProfileCircle, IconRecords,
  IconSettings, IconLogout, IconHamburger, IconClose, IconClock, IconCheck,
} from "./Icons.jsx";

const NAV_ITEMS = [
  { to: "/app/dashboard", label: "Dashboard", Icon: IconDashboard },
  { to: "/app/scanner", label: "Scanner", Icon: IconScanner },
  { to: "/app/medicines", label: "Medicines", Icon: IconMedicines },
  { to: "/app/dosage", label: "Dosage Calc", Icon: IconDosage },
  { to: "/app/assistant", label: "AI Assistant", Icon: IconAssistant },
  { to: "/app/reports", label: "Reports", Icon: IconReports },
];

export default function Navbar({ onOpenDrawer }) {
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'notif' | 'profile' | null
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const { state, addRecentSearch, clearRecentSearches, toggleDarkMode } = useAppState();
  const { user, logout } = useAuth();
  const toast = useToast();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (!e.target.closest(".dropdown") && !e.target.closest(".search-box")) {
        setOpenDropdown(null);
        setSearchOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        wrapRef.current?.querySelector("#searchInput")?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") { setOpenDropdown(null); setSearchOpen(false); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function pickSearch(val) {
    setQuery(val);
    addRecentSearch(val);
    setSearchOpen(false);
    navigate("/app/medicines");
    toast(`Showing results for "${val}"`, "success");
  }

  function voiceSearch() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast("Voice search isn't supported in this browser.", "warn"); return; }
    const rec = new SR();
    rec.lang = "en-US";
    toast("Listening…", "success");
    rec.onresult = (ev) => { setQuery(ev.results[0][0].transcript); setSearchOpen(true); };
    rec.onerror = () => toast("Couldn't hear that — try again.", "warn");
    rec.start();
  }

  const q = query.trim().toLowerCase();
  const medNames = state.medicines.map((m) => m.name);
  const pool = Array.from(new Set([...medNames, ...POPULAR_MEDS]));
  const suggestions = q ? pool.filter((n) => n.toLowerCase().includes(q)).slice(0, 6) : [];

  const recentHistory = state.history.slice(-5).reverse();
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className={`navbar${scrolled ? " scrolled" : ""}`} id="navbar" ref={wrapRef}>
      <div className="navbar-inner">
        <NavLink to="/app/dashboard" className="brand" aria-label="MediCare Home">
          <span className="brand-icon" aria-hidden="true"><IconLogo /></span>
          <span className="brand-text"><b>MediCare</b><span>AI Health Companion</span></span>
        </NavLink>

        <nav className="nav-links" aria-label="Primary">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="nav-right">
          <div className="search-box">
            <IconSearch />
            <input
              type="text" id="searchInput" placeholder="Search medicines…" autoComplete="off"
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="icon-btn-mini" aria-label="Voice search" title="Voice search" onClick={voiceSearch} type="button">
              <IconMic />
            </button>
            <span className="kbd">Ctrl K</span>
            <div className={`dropdown${searchOpen ? " open" : ""}`} role="listbox">
              {q && suggestions.length > 0 && (
                <>
                  <div className="dropdown-header">Suggestions</div>
                  {suggestions.map((r) => (
                    <button key={r} className="dropdown-item" onClick={() => pickSearch(r)} type="button">
                      <IconSearch /><span className="dd-title">{r}</span>
                    </button>
                  ))}
                </>
              )}
              {q && suggestions.length === 0 && (
                <>
                  <div className="dropdown-header">No matches</div>
                  <div style={{ padding: "8px 12px", color: "var(--muted)", fontSize: 13 }}>Try “Paracetamol” or “Ibuprofen”.</div>
                </>
              )}
              {state.recentSearches.length > 0 && (
                <>
                  <div className="dropdown-header">
                    Recent
                    <span className="link" onClick={(e) => { e.stopPropagation(); clearRecentSearches(); }}>Clear</span>
                  </div>
                  {state.recentSearches.slice(0, 4).map((r) => (
                    <button key={r} className="dropdown-item" onClick={() => pickSearch(r)} type="button">
                      <IconClock /><span className="dd-title">{r}</span>
                    </button>
                  ))}
                </>
              )}
              {!q && (
                <>
                  <div className="dropdown-header">Popular medicines</div>
                  {POPULAR_MEDS.slice(0, 5).map((r) => (
                    <button key={r} className="dropdown-item" onClick={() => pickSearch(r)} type="button">
                      <IconSearch /><span className="dd-title">{r}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="dropdown-wrap">
            <button
              className="icon-btn" aria-haspopup="true" aria-label="Notifications" type="button"
              aria-expanded={openDropdown === "notif"}
              onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === "notif" ? null : "notif"); }}
            >
              <IconBell />
              {recentHistory.length > 0 && <span className="badge">{Math.min(9, recentHistory.length + 1)}</span>}
            </button>
            <div className={`dropdown${openDropdown === "notif" ? " open" : ""}`}>
              <div className="dropdown-header">
                Notifications
                <span className="link" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }}>Clear all</span>
              </div>
              {recentHistory.length ? recentHistory.map((h, i) => {
                const label = h.action === "taken" ? "marked as taken" : h.action === "skipped" ? "skipped" : "snoozed for 10 minutes";
                return (
                  <button className="dropdown-item" key={i} type="button">
                    <span style={{ color: "var(--primary)" }}>{h.action === "taken" ? <IconCheck /> : h.action === "skipped" ? <IconClose /> : <IconClock />}</span>
                    <span><span className="dd-title">{h.name} {label}</span><br /><span className="dd-sub">{fmtTime12(h.time)} · {h.date}</span></span>
                  </button>
                );
              }) : (
                <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>You're all caught up 🎉</div>
              )}
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" type="button"><span className="dot"></span><span><span className="dd-title">Interaction warnings</span><br /><span className="dd-sub">Check the Interaction Checker for details</span></span></button>
              <button className="dropdown-item" type="button"><span className="dot"></span><span><span className="dd-title">Prescription completed</span><br /><span className="dd-sub">Scanner results appear here</span></span></button>
            </div>
          </div>

          <button className="hamburger" aria-label="Open menu" type="button" onClick={onOpenDrawer}>
            <IconHamburger />
          </button>

          <div className="dropdown-wrap">
            <button
              className="avatar-btn" aria-haspopup="true" aria-label="Profile menu" type="button"
              aria-expanded={openDropdown === "profile"}
              onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === "profile" ? null : "profile"); }}
            >
              <span className="avatar">{initials}</span>
            </button>
            <div className={`dropdown${openDropdown === "profile" ? " open" : ""}`}>
              <div className="dropdown-header">{user?.name}<br /><span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12 }}>{user?.email}</span></div>
              <div className="dropdown-divider"></div>
              <NavLink className="dropdown-item" to="/app/profile" onClick={() => setOpenDropdown(null)}>
                <IconProfileCircle /><span><span className="dd-title">Profile</span><br /><span className="dd-sub">View & edit your details</span></span>
              </NavLink>
              <NavLink className="dropdown-item" to="/app/reports" onClick={() => setOpenDropdown(null)}>
                <IconRecords /><span><span className="dd-title">Health Records</span><br /><span className="dd-sub">Reports & history</span></span>
              </NavLink>
              <NavLink className="dropdown-item" to="/app/profile" onClick={() => setOpenDropdown(null)}>
                <IconSettings /><span className="dd-title">Settings</span>
              </NavLink>
              <div className="toggle-row">
                <span className="dd-title">Dark Mode</span>
                <label className="switch"><input type="checkbox" checked={state.darkMode} onChange={toggleDarkMode} /><span className="slider"></span></label>
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item danger" type="button" onClick={() => { logout(); toast("You've been logged out.", "success"); navigate("/"); }}>
                <IconLogout /><span className="dd-title">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
