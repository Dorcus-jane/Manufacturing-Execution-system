import { useState, useEffect, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

type Role = "executive" | "manager" | "operator";

interface RoleConfig {
  label: string;
  icon: JSX.Element;
  description: string;
  emailPlaceholder: string;
  emailLabel: string;
  demoEmail: string;
  demoPassword: string;
}

const roleConfig: Record<Role, RoleConfig> = {
  executive: {
    label: "Executive",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1" />
      </svg>
    ),
    description: "Corporate leadership access. Use your registered company email and password.",
    emailLabel: "Corporate Email Address",
    emailPlaceholder: "admin@dojohub.test",
    demoEmail: "admin@dojohub.test",
    demoPassword: "ChangeMe123!",
  },
  manager: {
    label: "Manager",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
    description: "Line and shift management access. Use your registered manager email and password.",
    emailLabel: "Manager Email Address",
    emailPlaceholder: "manager@dojohubug.com",
    demoEmail: "janet.babirye@dojohubug.com",
    demoPassword: "manager2026",
  },
  operator: {
    label: "Operator",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    description: "Floor operator access. Use your registered phone number and PIN.",
    emailLabel: "Phone Number",
    emailPlaceholder: "+256700000000",
    demoEmail: "+256755018903",
    demoPassword: "1234",
  },
};

interface PublicStats {
  activeLines: number;
  activeJobs: number;
  todayOutput: number;
}

export default function Login() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const [role, setRole] = useState<Role>("executive");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/public/stats")
      .then((res) => res.json())
      .then(setPublicStats)
      .catch(() => {});
  }, []);

  const config = roleConfig[role];

  const handleAutofill = () => {
    setEmail(config.demoEmail);
    setPassword(config.demoPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = role === "operator" ? "/auth/operator-login" : "/auth/login";
      const body = role === "operator" ? { phone: email, pin: password } : { email, password };

      const data = await apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) });

      authLogin(data.token, data.user);
      navigate(`/${data.user.role.toLowerCase()}`);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* LEFT PANEL */}
      <div className="login-hero">
        <div className="login-hero-header">
          <div className="login-brand">
            <div className="login-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div>
              <div className="login-brand-name">Dojo Hub Uganda</div>
              <div className="login-brand-sub">Manufacturing Execution System</div>
            </div>
          </div>
          <div className="login-status-pill">
            <span className="login-status-dot" />
            System Online
          </div>
        </div>

        <div className="login-hero-body">
          <h1 className="login-hero-title">
            Dojo Hub Uganda
            <br />
            MES Portal
          </h1>
          <p className="login-hero-desc">
            Premium automated beverage manufacturing — from mango and pineapple pulp extraction to aseptic filling
            and quality control. One unified platform for executives, managers, and floor operators.
          </p>

          <div className="login-line-card">
            <div className="login-line-stations">
              <div className="login-line-station">
                <span className="login-station-dot dot-green" />
                <div className="login-station-box">
                  <div className="login-liquid" style={{ height: "65%" }} />
                  <span className="login-station-label">FILL</span>
                </div>
              </div>
              <div className="login-line-station">
                <span className="login-station-dot dot-green" />
                <div className="login-station-box">
                  <div className="login-liquid" style={{ height: "50%" }} />
                  <span className="login-station-label">UHT</span>
                </div>
              </div>
              <div className="login-line-station">
                <span className="login-station-dot dot-yellow" />
                <div className="login-station-box">
                  <div className="login-liquid slow" style={{ height: "30%" }} />
                  <span className="login-station-label">QC</span>
                </div>
              </div>
            </div>
            <div className="login-line-footer">
              <span className="login-status-dot dot-green" />
              {publicStats
                ? `${publicStats.activeLines} Line${publicStats.activeLines !== 1 ? "s" : ""} — Active Production`
                : "Line A — Active Production"}
            </div>
          </div>
        </div>

        <div className="login-stats-row">
          <div className="login-stat">
            <div className="login-stat-value">87%</div>
            <div className="login-stat-label">Real-time OEE</div>
          </div>
          <div className="login-stat">
            <div className="login-stat-value">{publicStats ? publicStats.activeLines : "—"}</div>
            <div className="login-stat-label">Active Lines</div>
          </div>
          <div className="login-stat">
            <div className="login-stat-value">
              {publicStats ? `${publicStats.todayOutput.toLocaleString()}L` : "—"}
            </div>
            <div className="login-stat-label">Today Output</div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="login-form-panel">
        <div className="login-form-wrap">
          <h2 className="login-form-title">Workspace Access</h2>
          <p className="login-form-sub">Select your role and sign in to continue.</p>

          <div className="login-role-tabs">
            {(Object.keys(roleConfig) as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`login-role-tab ${role === r ? "active" : ""}`}
                onClick={() => {
                  setRole(r);
                  setEmail("");
                  setPassword("");
                  setError("");
                }}
              >
                {roleConfig[r].icon}
                {roleConfig[r].label}
              </button>
            ))}
          </div>

          <p className="login-role-desc">{config.description}</p>

          <form onSubmit={handleSubmit}>
            <label className="login-field-label">{config.emailLabel}</label>
            <div className="login-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
              <input
                type="text"
                required
                placeholder={config.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <label className="login-field-label">{role === "operator" ? "PIN" : "Password"}</label>
            <div className="login-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword((s) => !s)}
                aria-label="Toggle password visibility"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? "Authenticating..." : "Authenticate & Enter Workspace"}
              {!loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>

            <div className="login-forgot">
              Forgot Credentials? <a href="#">Contact System Administrator</a>
            </div>
          </form>

          <div className="login-demo-box">
            <div className="login-demo-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              DEMO TEST CREDENTIALS
            </div>
            <div className="login-demo-row">
              <div>
                <div className="login-demo-label">{role === "operator" ? "PHONE" : "EMAIL"}</div>
                <div className="login-demo-value">{config.demoEmail}</div>
              </div>
              <div>
                <div className="login-demo-label">{role === "operator" ? "PIN" : "PASSWORD"}</div>
                <div className="login-demo-value">{config.demoPassword}</div>
              </div>
              <button type="button" className="login-autofill-btn" onClick={handleAutofill}>
                Autofill
              </button>
            </div>
          </div>

          <p className="login-footer-note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Secured by Dojo Hub Uganda MES — Role-based access control
          </p>
        </div>
      </div>
    </div>
  );
}