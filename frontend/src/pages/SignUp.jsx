import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicNavbar from "../components/PublicNavbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  IconLogo, IconMail, IconLock, IconUser, IconEyeOpen, IconEyeOff, IconArrowLeft,
  IconCheck, IconDosage, IconReports,
} from "../components/Icons.jsx";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const { signup, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!agree) { setError("Please agree to the terms to continue."); return; }
    try {
      await signup({ name, email, password });
      toast("Account created — welcome to MediCare!", "success");
      navigate("/app/dashboard", { replace: true });
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
              <h2>Start your MediCare journey</h2>
              <p>Create a free account to add your medicines and get your first reminder set up in under a minute.</p>
              <div className="auth-side-list">
                <div><IconCheck /> Free to get started, no credit card needed</div>
                <div><IconDosage /> Built-in dosage calculator and interaction checker</div>
                <div><IconReports /> Adherence reports so you can see your progress</div>
              </div>
            </div>
            <div className="auth-form-wrap">
              <Link to="/" className="back-home-link"><IconArrowLeft /> Back to home</Link>
              <h1>Create your account</h1>
              <p>Get started with MediCare in a few seconds.</p>
              {error && <div className="auth-error">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="suName">Full name</label>
                  <div className="password-row">
                    <input type="text" className="input" id="suName" placeholder="e.g. Aisha Sharma" required value={name} onChange={(e) => setName(e.target.value)} style={{ paddingLeft: 40 }} />
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}><IconUser /></span>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="suEmail">Email address</label>
                  <div className="password-row">
                    <input type="email" className="input" id="suEmail" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: 40 }} />
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}><IconMail /></span>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="suPassword">Password</label>
                    <div className="password-row">
                      <input type={showPassword ? "text" : "password"} className="input" id="suPassword" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingLeft: 40 }} />
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}><IconLock /></span>
                      <button type="button" className="password-toggle" aria-label="Toggle password visibility" onClick={() => setShowPassword((v) => !v)}>
                        {showPassword ? <IconEyeOff /> : <IconEyeOpen />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="suConfirm">Confirm password</label>
                    <div className="password-row">
                      <input type={showPassword ? "text" : "password"} className="input" id="suConfirm" placeholder="••••••••" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ paddingLeft: 40 }} />
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}><IconLock /></span>
                    </div>
                  </div>
                </div>
                <div className="checkbox-row">
                  <input type="checkbox" id="suAgree" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <label htmlFor="suAgree">I agree to the Terms of Service and Privacy Policy</label>
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? "Creating account…" : "Create Account"}
                </button>
              </form>
              <div className="auth-switch">
                Already have an account? <Link to="/signin">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
