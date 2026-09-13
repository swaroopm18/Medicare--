import { useAppState } from "../context/AppStateContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { state, toggleDarkMode, setSoundEnabled } = useAppState();
  const { user } = useAuth();
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const memberSince = user?.member_since
    ? new Date(user.member_since).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "";

  return (
    <section className="page active">
      <div className="page-head">
        <div><span className="eyebrow">User Profile</span><h1>Profile &amp; Settings</h1></div>
      </div>
      <div className="grid grid-split">
        <div className="card" style={{ textAlign: "center" }}>
          <span className="avatar" style={{ width: 88, height: 88, fontSize: 30, margin: "0 auto 14px" }}>{initials}</span>
          <h3>{user?.name}</h3>
          <p>{user?.email}</p>
          {memberSince && <p style={{ marginTop: 10 }}>Member since {memberSince}</p>}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Preferences</h3>
          <div className="toggle-row" style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <span>Dark Mode</span>
            <label className="switch"><input type="checkbox" checked={state.darkMode} onChange={toggleDarkMode} /><span className="slider"></span></label>
          </div>
          <div className="toggle-row" style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <span>Medicine Reminder Alarm Sound</span>
            <label className="switch"><input type="checkbox" checked={state.soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} /><span className="slider"></span></label>
          </div>
          <div className="toggle-row" style={{ padding: "12px 0" }}>
            <span>Push Notifications</span>
            <label className="switch"><input type="checkbox" defaultChecked /><span className="slider"></span></label>
          </div>
        </div>
      </div>
    </section>
  );
}
