import { useState, useRef } from "react";

interface Props {
  onClose: () => void;
  onConfirm: (details: { scope: string; reason: string; notes: string }) => void;
}

const stopReasons = [
  "Machine Malfunction", "Safety Hazard", "Injury / Medical Emergency",
  "Fire / Smoke", "Chemical Spill", "Power Failure", "Other",
];

const HOLD_DURATION_MS = 1500;

export default function EmergencyStopModal({ onClose, onConfirm }: Props) {
  const [scope, setScope] = useState<"facility" | "job">("facility");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopHold = () => {
    setHolding(false);
    setProgress(0);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const tick = () => {
    const elapsed = Date.now() - startTimeRef.current;
    const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
    setProgress(pct);
    if (pct >= 100) {
      handleConfirmed();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const startHold = () => {
    if (!reason) {
      setError("Select a reason before confirming.");
      return;
    }
    setError("");
    setHolding(true);
    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleConfirmed = () => {
    stopHold();
    onConfirm({ scope: scope === "facility" ? "Halt Facility-Wide Production" : "Halt Specific Active Job Run Only", reason, notes });
  };

  return (
    <div className="es-overlay" onClick={onClose}>
      <div className="es-modal" onClick={(e) => e.stopPropagation()}>
        <div className="es-header">
          <div className="es-header-left">
            <span className="es-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
            </span>
            <div>
              <div className="es-title">EMERGENCY STOP ACTIVATION</div>
              <div className="es-sub">Confirm production halt parameters</div>
            </div>
          </div>
          <button className="es-close" onClick={onClose}>×</button>
        </div>

        <label className="es-label">Stop Scope *</label>
        <div
          className={`es-scope-option ${scope === "facility" ? "selected" : ""}`}
          onClick={() => setScope("facility")}
        >
          <span className={`es-radio ${scope === "facility" ? "checked" : ""}`} />
          <div>
            <div className="es-scope-title">Halt Facility-Wide Production</div>
            <div className="es-scope-desc">All lines, all active jobs, immediate shutdown</div>
          </div>
        </div>
        <div
          className={`es-scope-option ${scope === "job" ? "selected" : ""}`}
          onClick={() => setScope("job")}
        >
          <span className={`es-radio ${scope === "job" ? "checked" : ""}`} />
          <div>
            <div className="es-scope-title">Halt Specific Active Job Run Only</div>
            <div className="es-scope-desc">Stop designated production job, others continue</div>
          </div>
        </div>

        <label className="es-label">Reason for Stop *</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Select reason...</option>
          {stopReasons.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <label className="es-label">Additional Details</label>
        <textarea
          placeholder="Describe the situation and any immediate actions taken..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        {error && <div className="es-error">{error}</div>}

        <button
          className={`es-hold-btn ${holding ? "holding" : ""}`}
          onMouseDown={startHold}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={startHold}
          onTouchEnd={stopHold}
        >
          <span className="es-hold-fill" style={{ width: `${progress}%` }} />
          <span className="es-hold-label">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M9 9h6v6H9z" />
            </svg>
            {holding ? "HOLD TO CONFIRM..." : "HOLD TO CONFIRM EMERGENCY STOP"}
          </span>
        </button>
        <div className="es-hold-hint">Hold button for 1.5 seconds to confirm activation</div>
      </div>
    </div>
  );
}