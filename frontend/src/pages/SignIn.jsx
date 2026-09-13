import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PublicNavbar from "../components/PublicNavbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  IconLogo, IconMail, IconLock, IconEyeOpen, IconEyeOff, IconArrowLeft,
  IconCheck, IconScanner, IconAssistant,
} from "../components/Icons.jsx";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const { signin, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await signin({ email, password });
      toast("Welcome back!", "success");
      navigate(location.state?.from?.pathname || "/app/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app">
      <PublicNavbar />
      <main>
        <div className="container auth-shell">
          <div className="auth-grid">
            <div className="auth-side">
              <span className="brand-icon"><IconLogo width={26} height={26} /></span>
              <h2>Welcome back to MediCare</h2>
              <p>Sign in to see today's schedule, get reminded on time, and keep your adherence streak going.</p>
              <div className="auth-side-list">
                <div><IconCheck /> Real alarm reminders, not just notifications</div>
                <div><IconScanner /> Scan prescriptions instead of typing them out</div>
                <div><IconAssistant /> Ask the AI assistant about your medicines anytime</div>
              </div>
            </div>
            <div className="auth-form-wrap">
              <Link to="/" className="back-home-link"><IconArrowLeft /> Back to home</Link>
              <h1>Sign in</h1>
              <p>Enter your details to access your dashboard.</p>
              {error && <div className="auth-error">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="siEmail">Email address</label>
                  <div className="password-row">
                    <input type="email" className="input" id="siEmail" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: 40 }} />
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}><IconMail /></span>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="siPassword">Password</label>
                  <div className="password-row">
                    <input type={showPassword ? "text" : "password"} className="input" id="siPassword" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingLeft: 40 }} />
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}><IconLock /></span>
                    <button type="button" className="password-toggle" aria-label="Toggle password visibility" onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? <IconEyeOff /> : <IconEyeOpen />}
                    </button>
                  </div>
                </div>
                <div className="checkbox-row">
                  <input type="checkbox" id="siRemember" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <label htmlFor="siRemember">Remember me on this device</label>
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </form>
              <div className="auth-switch">
                Don't have an account? <Link to="/signup">Create one</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
