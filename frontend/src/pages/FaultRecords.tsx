import { useState, useEffect } from "react";
import { apiFetch } from "../api/client";

interface FaultLogEntry {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  severity: "MINOR" | "CRITICAL";
  loggedAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  job: { jobId: string; productName: string };
  stage: { stageName: string } | null;
  operator: { operatorName: string | null; fullName: string | null };
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function FaultRecords() {
  const [filter, setFilter] = useState<"All" | "Unresolved" | "Resolved">("All");
  const [faults, setFaults] = useState<FaultLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const fetchFaults = () => {
    setLoading(true);
    setError("");
    apiFetch("/faults")
      .then(setFaults)
      .catch((e) => setError(e.message || "Failed to load fault records."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFaults();
  }, []);

  const total = faults.length;
  const unresolvedCount = faults.filter((f) => !f.resolvedAt).length;
  const resolvedCount = total - unresolvedCount;

  const filtered = faults.filter((f) => {
    if (filter === "Unresolved") return !f.resolvedAt;
    if (filter === "Resolved") return !!f.resolvedAt;
    return true;
  });

  const openResolve = (id: string) => {
    setResolvingId(id);
    setResolutionNotes("");
  };

  const submitResolve = async (id: string) => {
    try {
      await apiFetch(`/faults/${id}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ resolutionNotes }),
      });
      setResolvingId(null);
      setResolutionNotes("");
      fetchFaults();
    } catch (e: any) {
      alert(e.message || "Failed to resolve fault.");
    }
  };

  return (
    <>
      <h1 className="mgr-page-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
        Fault Records
      </h1>
      <p className="mgr-page-sub">Track and review fault reports from the production floor.</p>

      <div className="mgr-fault-stats-row">
        <div className="mgr-fault-stat">
          <span style={{ color: "#d97706" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </span>
          <div>
            <div className="mgr-fault-stat-value">{total}</div>
            <div className="mgr-fault-stat-label">Total Faults</div>
          </div>
        </div>
        <div className="mgr-fault-stat">
          <span style={{ color: "#dc2626" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
          </span>
          <div>
            <div className="mgr-fault-stat-value">{unresolvedCount}</div>
            <div className="mgr-fault-stat-label">Unresolved</div>
          </div>
        </div>
        <div className="mgr-fault-stat">
          <span style={{ color: "#16a34a" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" />
            </svg>
          </span>
          <div>
            <div className="mgr-fault-stat-value">{resolvedCount}</div>
            <div className="mgr-fault-stat-label">Resolved</div>
          </div>
        </div>
      </div>

      <div className="mgr-fault-filter-row">
        <div className="mgr-filter-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          <span style={{ fontSize: 12, color: "#64748b", marginRight: 4 }}>Filter:</span>
          {(["All", "Unresolved", "Resolved"] as const).map((f) => (
            <button key={f} className={`mgr-filter-chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <button className="mgr-secondary-btn" onClick={fetchFaults} disabled={loading}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ animation: loading ? "mgr-fault-spin 0.8s linear infinite" : "none" }}>
            <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {loading && (
        <div className="mgr-card" style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
          Loading fault records...
        </div>
      )}

      {!loading && error && (
        <div className="mgr-card" style={{ textAlign: "center", padding: "40px 0", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="mgr-card mgr-fault-empty">
          <span className="mgr-check-icon">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" />
            </svg>
          </span>
          <div className="mgr-empty-title">No faults found</div>
          <div className="mgr-empty-sub">
            {total === 0 ? "No fault records reported yet." : "No fault records match this filter."}
          </div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((f) => (
            <div
              key={f.id}
              className="mgr-alert-item"
              style={
                f.severity === "CRITICAL"
                  ? { background: "#fef2f2", borderColor: "#fecaca" }
                  : undefined
              }
            >
              <span className="mgr-alert-icon" style={{ color: f.severity === "CRITICAL" ? "#dc2626" : "#d97706" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div className="mgr-alert-title-row">
                  <span className="mgr-alert-title" style={{ color: f.severity === "CRITICAL" ? "#991b1b" : "#92400e" }}>
                    {f.title} {f.severity === "CRITICAL" && "· CRITICAL"}
                  </span>
                  <span className="mgr-alert-time">{timeAgo(f.loggedAt)}</span>
                </div>
                <div className="mgr-alert-desc">
                  {f.job.jobId} — {f.job.productName}
                  {f.stage ? ` · ${f.stage.stageName}` : ""} · reported by{" "}
                  {f.operator.operatorName || f.operator.fullName || "Unknown"}
                </div>
                {f.description && (
                  <div className="mgr-alert-desc" style={{ fontStyle: "italic" }}>
                    "{f.description}"
                  </div>
                )}

                {f.resolvedAt ? (
                  <div className="mgr-alert-footer">
                    <span style={{ color: "#16a34a", fontWeight: 700 }}>
                      ✓ Resolved {timeAgo(f.resolvedAt)}
                      {f.resolutionNotes ? ` — ${f.resolutionNotes}` : ""}
                    </span>
                  </div>
                ) : resolvingId === f.id ? (
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      placeholder="Resolution notes..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={2}
                      style={{
                        width: "100%",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: "8px 10px",
                        fontSize: 12.5,
                        fontFamily: "inherit",
                        marginBottom: 8,
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="mgr-dismiss-btn" onClick={() => setResolvingId(null)}>
                        Cancel
                      </button>
                      <button
                        className="mgr-dismiss-btn"
                        style={{ color: "#16a34a" }}
                        onClick={() => submitResolve(f.id)}
                      >
                        Confirm Resolved
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mgr-alert-footer">
                    <button className="mgr-dismiss-btn" onClick={() => openResolve(f.id)}>
                      Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}