import { useState, useEffect, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import BlueprintLibrary from "./BlueprintLibrary";
import JobBuilder from "./JobBuilder";
import OperatorRoster from "./OperatorRoster";
import FaultRecords from "./FaultRecords";
import EmergencyStopModal from "./EmergencyStopModal";
import "./ManagerDashboard.css";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../api/client";

const navItems = [
  { key: "operations", label: "Operations", icon: "grid" },
  { key: "blueprints", label: "Blueprint Library", icon: "book" },
  { key: "builder", label: "Job Builder", icon: "wrench" },
  { key: "roster", label: "Operator Roster", icon: "users" },
  { key: "faults", label: "Fault Records", icon: "alert" },
];

const icons: Record<string, JSX.Element> = {
  grid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  book: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z" />
    </svg>
  ),
  wrench: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  alert: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  search: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  stop: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 9h6v6H9z" />
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  activity: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  play: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  clock: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  user: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  pin: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  logout: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
};

interface Line {
  id: string;
  lineCode: string;
  name: string;
  description: string | null;
  targetProduct: string;
  isActive: boolean;
}

interface StageWithOperator {
  id: string;
  stageName: string;
  stationTag: string | null;
  status: string;
  estimatedDurationMinutes: number | null;
  operator: { operatorName: string | null } | null;
}

interface Job {
  id: string;
  jobId: string;
  name: string | null;
  productName: string;
  status: string;
  stages: StageWithOperator[];
}

interface FaultFeedItem {
  id: string;
  title: string;
  description: string | null;
  severity: "MINOR" | "CRITICAL";
  loggedAt: string;
  job: { jobId: string };
  operator: { operatorName: string | null; fullName: string | null };
}

interface EmergencyStopDetails {
  scope: string;
  reason: string;
  notes: string;
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

export default function ManagerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState("operations");
  const [search, setSearch] = useState("");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [activeStop, setActiveStop] = useState<EmergencyStopDetails | null>(null);

  const [lines, setLines] = useState<Line[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [faultsFeed, setFaultsFeed] = useState<FaultFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dismissing, setDismissing] = useState<string | null>(null);

  const loadOperationsData = () => {
    setLoading(true);
    setLoadError("");
    Promise.all([
      apiFetch("/lines"),
      apiFetch("/jobs"),
      apiFetch("/faults/feed"),
    ])
      .then(([linesData, jobsData, faultsData]) => {
        setLines(linesData);
        setJobs(jobsData);
        setFaultsFeed(faultsData);
      })
      .catch((e) => setLoadError(e.message || "Failed to load dashboard data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (active === "operations") loadOperationsData();
  }, [active]);

  const handleConfirmStop = (details: EmergencyStopDetails) => {
    // TODO: replace with real API call, e.g. api.post("/emergency-stop", details)
    setActiveStop(details);
    setShowEmergencyModal(false);
  };

  const handleResolveStop = () => {
    // TODO: replace with real API call to clear the stop, e.g. api.post("/emergency-stop/resolve")
    setActiveStop(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleDismissAlert = async (faultId: string) => {
    setDismissing(faultId);
    try {
      await apiFetch(`/faults/${faultId}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ action: "DISMISSED", resolutionNotes: "Dismissed from Live Alerts" }),
      });
      setFaultsFeed((prev) => prev.filter((f) => f.id !== faultId));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDismissing(null);
    }
  };

  const activeJobs = jobs.filter((j) => j.status === "ACTIVE");
  const monitoredJob = activeJobs[0];

  const activeLinesCount = lines.filter((l) => l.isActive).length;

  return (
    <div className="mgr-layout">
      <aside className="mgr-sidebar">
        <div className="mgr-sidebar-brand">
          <div className="mgr-brand-icon">{icons.grid}</div>
          <div>
            <div className="mgr-brand-name">Dojo Hub</div>
            <div className="mgr-brand-sub">Uganda MES</div>
          </div>
        </div>

        <nav className="mgr-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`mgr-nav-item ${active === item.key ? "active" : ""}`}
              onClick={() => setActive(item.key)}
            >
              {icons[item.icon]}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="mgr-main">
        {activeStop && (
          <div className="mgr-emergency-banner">
            <div className="mgr-emergency-banner-left">
              ⚠ EMERGENCY STOP ACTIVE — {activeStop.scope} · Reason: {activeStop.reason}
            </div>
            <button className="mgr-emergency-resolve-btn" onClick={handleResolveStop}>
              Mark Resolved
            </button>
          </div>
        )}

        <header className="mgr-header">
          <div className="mgr-search-wrap">
            {icons.search}
            <input
              placeholder="Search jobs, operators, or faults..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="mgr-header-right">
            <button className="mgr-emergency-btn" onClick={() => setShowEmergencyModal(true)}>
              {icons.stop}
              EMERGENCY STOP
            </button>
            <button className="mgr-bell-btn">
              {icons.bell}
              {faultsFeed.length > 0 && <span className="mgr-bell-dot" />}
            </button>
            <div className="mgr-user-chip">
              <span className="mgr-avatar">
                {user?.fullName?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "MG"}
              </span>
              <div>
                <div className="mgr-user-name">{user?.fullName || "Manager"}</div>
                <div className="mgr-user-role">Manager</div>
              </div>
            </div>
            <button className="mgr-bell-btn" onClick={handleLogout} title="Log out">
              {icons.logout}
            </button>
          </div>
        </header>

        <main className="mgr-content">
          {active === "operations" && (
            <>
              {loading && (
                <div className="mgr-card" style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                  Loading operations data...
                </div>
              )}

              {!loading && loadError && (
                <div className="mgr-card" style={{ textAlign: "center", padding: "40px 0", color: "#dc2626" }}>
                  {loadError}
                  <div style={{ marginTop: 10 }}>
                    <button className="mgr-secondary-btn" onClick={loadOperationsData}>Retry</button>
                  </div>
                </div>
              )}

              {!loading && !loadError && (
                <>
                  <div className="mgr-grid-2col">
                    <div>
                      <h2 className="mgr-section-title">Your Assigned Production Lines</h2>
                      <p className="mgr-section-sub">Select a line to build a job and orchestrate process workflows.</p>

                      {lines.length === 0 && (
                        <div style={{ fontSize: 13, color: "#94a3b8" }}>No production line assigned to you yet.</div>
                      )}

                      <div className="mgr-lines-grid">
                        {lines.map((line) => (
                          <div className="mgr-line-card" key={line.id}>
                            <div className="mgr-line-top">
                              <span className="mgr-line-icon">{icons.grid}</span>
                              <span className="mgr-status-badge">{line.isActive ? "Active" : "Inactive"}</span>
                            </div>
                            <div className="mgr-line-code">{line.lineCode}</div>
                            <div className="mgr-line-name">{line.name}</div>
                            <p className="mgr-line-desc">{line.description || "No description provided."}</p>
                            <div className="mgr-line-product">
                              <span className="mgr-dot" />
                              {line.targetProduct}
                            </div>
                            <button className="mgr-build-btn" onClick={() => setActive("builder")}>
                              {icons.play}
                              Build Job
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mgr-card mgr-metrics-card">
                      <div className="mgr-card-header">
                        <span className="mgr-card-title">{icons.activity} Manager Metrics</span>
                      </div>
                      <div className="mgr-metric-row">
                        <span className="mgr-metric-label">YOUR ASSIGNED LINES</span>
                        <span className="mgr-metric-value">{activeLinesCount}</span>
                      </div>
                      <div className="mgr-metric-row">
                        <span className="mgr-metric-label">ACTIVE PRODUCTION JOBS</span>
                        <span className="mgr-metric-value">{activeJobs.length}</span>
                      </div>
                      <div className="mgr-metric-row">
                        <span className="mgr-metric-label">UNRESOLVED FAULTS</span>
                        <span className={`mgr-metric-value ${faultsFeed.length === 0 ? "green" : ""}`}>
                          {faultsFeed.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mgr-grid-2col bottom">
                    <div className="mgr-card">
                      <div className="mgr-card-header">
                        <span className="mgr-card-title">{icons.activity} Live Job Monitor</span>
                      </div>

                      {!monitoredJob && (
                        <div style={{ fontSize: 12.5, color: "#94a3b8", padding: "10px 0" }}>
                          No active jobs right now.
                        </div>
                      )}

                      {monitoredJob && (
                        <div className="mgr-job-block">
                          <div className="mgr-job-block-header">
                            <span className="mgr-job-block-id">{monitoredJob.jobId}</span>
                            <span className="mgr-job-block-name">
                              · {monitoredJob.name || monitoredJob.productName}
                            </span>
                            <span className="mgr-job-block-progress">
                              {monitoredJob.stages.filter((s) => s.status === "COMPLETED").length} / {monitoredJob.stages.length} stages
                            </span>
                          </div>

                          {monitoredJob.stages.map((s) => (
                            <div className="mgr-stage-row" key={s.id}>
                              <span className="mgr-stage-badge">{s.status}</span>
                              <div className="mgr-stage-info">
                                <div className="mgr-stage-name">{s.stageName}</div>
                                <div className="mgr-stage-meta">
                                  {icons.user} {s.operator?.operatorName || "Unassigned"} {icons.pin} {s.stationTag || "—"}
                                </div>
                              </div>
                              <span className="mgr-stage-eta">
                                {s.estimatedDurationMinutes ? `~${s.estimatedDurationMinutes} min` : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mgr-card">
                      <div className="mgr-card-header">
                        <span className="mgr-card-title">
                          <span style={{ color: "#d97706" }}>{icons.alert}</span> Live Manager Alerts
                        </span>
                      </div>
                      <p className="mgr-alerts-sub">Unresolved faults or paused operations. Sorted newest first.</p>

                      {faultsFeed.length === 0 && (
                        <div style={{ fontSize: 12.5, color: "#94a3b8", padding: "10px 0" }}>
                          No unresolved faults right now.
                        </div>
                      )}

                      {faultsFeed.map((f) => (
                        <div className="mgr-alert-item" key={f.id} style={{ marginBottom: 8 }}>
                          <span className="mgr-alert-icon" style={{ color: f.severity === "CRITICAL" ? "#dc2626" : "#d97706" }}>
                            {icons.alert}
                          </span>
                          <div>
                            <div className="mgr-alert-title-row">
                              <span className="mgr-alert-title">
                                {f.title} {f.severity === "CRITICAL" && "· CRITICAL"}
                              </span>
                              <span className="mgr-alert-time">{timeAgo(f.loggedAt)}</span>
                            </div>
                            <div className="mgr-alert-desc">
                              {f.job.jobId} · {f.operator.operatorName || f.operator.fullName || "Unknown"}
                              {f.description ? ` — ${f.description}` : ""}
                            </div>
                            <div className="mgr-alert-footer">
                              <span>&nbsp;</span>
                              <button
                                className="mgr-dismiss-btn"
                                onClick={() => handleDismissAlert(f.id)}
                                disabled={dismissing === f.id}
                              >
                                {dismissing === f.id ? "..." : "DISMISS"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {active === "blueprints" && <BlueprintLibrary />}
          {active === "builder" && <JobBuilder />}
          {active === "roster" && <OperatorRoster />}
          {active === "faults" && <FaultRecords />}
        </main>
      </div>

      {showEmergencyModal && (
        <EmergencyStopModal onClose={() => setShowEmergencyModal(false)} onConfirm={handleConfirmStop} />
      )}
    </div>
  );
}