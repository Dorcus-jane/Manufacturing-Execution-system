import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./OperatorStationLogin.css";

const stations = [
  "Preparation", "Washing", "Pulping", "Blending",
  "UHT Pasteurization", "Filling", "Labeling", "QC Station",
];

export default function OperatorStationLogin() {
  const navigate = useNavigate();
  const [station, setStation] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleKey = (digit: string) => {
    if (pin.length >= 4) return;
    setPin((p) => p + digit);
  };

  const handleClear = () => setPin("");
  const handleBackspace = () => setPin((p) => p.slice(0, -1));

  const handleSubmit = () => {
    if (!station) {
      setError("Select your station first.");
      return;
    }
    if (pin.length !== 4) {
      setError("Enter your 4-digit PIN.");
      return;
    }
    // Demo-only check — replace with a real PIN verification API call.
    setError("");
    navigate("/operator", { state: { station } });
  };

  return (
    <div className="opl-page">
      <div className="opl-card">
        <div className="opl-brand">
          <div className="opl-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div>
            <div className="opl-brand-name">Dojo Hub Uganda</div>
            <div className="opl-brand-sub">Station Authentication</div>
          </div>
        </div>

        <label className="opl-label">Select Your Station</label>
        <div className="opl-station-grid">
          {stations.map((s) => (
            <button
              key={s}
              className={`opl-station-btn ${station === s ? "active" : ""}`}
              onClick={() => {
                setStation(s);
                setError("");
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <label className="opl-label">Enter PIN</label>
        <div className="opl-pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`opl-pin-dot ${i < pin.length ? "filled" : ""}`} />
          ))}
        </div>

        {error && <div className="opl-error">{error}</div>}

        <div className="opl-keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map((k) =>
            k === "clear" ? (
              <button key={k} className="opl-key opl-key-text" onClick={handleClear}>Clear</button>
            ) : k === "back" ? (
              <button key={k} className="opl-key opl-key-text" onClick={handleBackspace}>⌫</button>
            ) : (
              <button key={k} className="opl-key" onClick={() => handleKey(k)}>{k}</button>
            )
          )}
        </div>

        <button className="opl-submit-btn" onClick={handleSubmit}>
          Authenticate & Start Shift
        </button>
      </div>
    </div>
  );
}