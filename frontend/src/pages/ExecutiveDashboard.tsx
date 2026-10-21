import { useState, useEffect, type JSX } from "react";
import ManagerAccounts from "./ManagerAccounts";
import ProductionLines from "./ProductionLines";
import ActiveJobs from "./ActiveJobs";
import HistoricalAnalytics from "./HistoricalAnalytics";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const navItems = [
  { key: "overview", label: "Enterprise Overview", icon: "grid" },
  { key: "managers", label: "Manager Accounts", icon: "users" },
  { key: "lines", label: "Production Lines", icon: "layers" },
  { key: "jobs", label: "Active Jobs", icon: "clipboard" },
  { key: "analytics", label: "Historical Analytics", icon: "bar-chart" },
];

const icons: Record<string, JSX.Element> = {
  grid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  layers: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5" />
    </svg>
  ),
  clipboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="18" rx="2" /><path d="M9 2h6v4H9zM9 11h6M9 15h6" />
    </svg>
  ),
  "bar-chart": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  alert: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  check: (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" />
    </svg>
  ),
};

interface Line {
  id: string;
  lineCode: string;
  name: string;
  isActive: boolean;
}

interface Manager {
  id: string;
  fullName: string;
  email: string;
}

interface CriticalAlert {
  id: string;
  title: string;
  description: string | null;
  loggedAt: string;
  job: { jobId: string; productName: string; line: { name: string } };
  stage: { stageName: string } | null;
}

function timeString(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

export default function ExecutiveDashboard() {
  const { user } = useAuth();
  const [active, setActive] = useState("overview");
  const [openManagerModal, setOpenManagerModal] = useState(false);
  const [openLineModal, setOpenLineModal] = useState(false);

  const [lines, setLines] = useState<Line[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadOverviewData = () => {
    setLoading(true);
    setLoadError("");
    Promise.all([
      apiFetch("/lines"),
      apiFetch("/users/managers"),
      apiFetch("/faults/critical"),
    ])
      .then(([linesData, managersData, alertsData]) => {
        setLines(linesData);
        setManagers(managersData);
        setCriticalAlerts(alertsData);
      })
      .catch((e) => setLoadError(e.message || "Failed to load dashboard data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (active === "overview") loadOverviewData();
  }, [active]);

  const activeLinesCount = lines.filter((l) => l.isActive).length;
  const linesWithoutManagerCount = 0; // schema requires a manager at line creation — always 0

  const stats = [
    {
      icon: <span style={{ color: "#2563eb" }}>{icons.layers}</span>,
      iconBg: "#dbeafe",
      trend: "↗ Stable",
      trendColor: "#16a34a",
      value: String(activeLinesCount),
      label: "Active Production Lines",
    },
    {
      icon: <span style={{ color: "#16a34a" }}>{icons.users}</span>,
      iconBg: "#dcfce7",
      trend: "",
      trendColor: "#16a34a",
      value: String(managers.length),
      label: "Active Operating Managers",
    },
    {
      icon: <span style={{ color: criticalAlerts.length > 0 ? "#dc2626" : "#16a34a" }}>{icons.alert}</span>,
      iconBg: criticalAlerts.length > 0 ? "#fee2e2" : "#dcfce7",
      trend: criticalAlerts.length > 0 ? "↘ Needs attention" : "✓ Clear",
      trendColor: criticalAlerts.length > 0 ? "#dc2626" : "#16a34a",
      value: String(criticalAlerts.length),
      label: "Critical Alerts",
    },
  ];

  const goToManagers = () => {
    setActive("managers");
    setOpenManagerModal(true);
  };

  const goToLines = () => {
    setActive("lines");
    setOpenLineModal(true);
  };

  return (
    <div className="dash-layout">
      <aside className="dash-sidebar">
        <div className="dash-sidebar-brand">
          <div className="dash-brand-icon">{icons.grid}</div>
          <div>
            <div className="dash-brand-name">Dojo Hub Uganda</div>
            <div className="dash-brand-sub">Executive Console</div>
          </div>
        </div>

        <nav className="dash-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`dash-nav-item ${active === item.key ? "active" : ""}`}
              onClick={() => setActive(item.key)}
            >
              {icons[item.icon]}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="dash-main">
        <header className="dash-header">
          <div>
            <div className="dash-header-title">Welcome back, {user?.fullName || "Director"}</div>
            <div className="dash-header-sub">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
          <div className="dash-header-right">
            <button className="dash-bell-btn">
              {icons.bell}
              {criticalAlerts.length > 0 && <span className="dash-bell-dot" />}
            </button>
            <div className="dash-status-pill">
              <span className="dash-status-dot" />
              System Online
            </div>
          </div>
        </header>

        <main className="dash-content">
          {active === "overview" && (
            <>
              <h1 className="dash-page-title">Strategic Overview</h1>
              <p className="dash-page-sub">
                Plant-wide performance snapshot — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>

              {loading && (
                <div className="dash-card" style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                  Loading overview data...
                </div>
              )}

              {!loading && loadError && (
                <div className="dash-card" style={{ textAlign: "center", padding: "40px 0", color: "#dc2626" }}>
                  {loadError}
                  <div style={{ marginTop: 10 }}>
                    <button className="dash-secondary-btn" onClick={loadOverviewData}>Retry</button>
                  </div>
                </div>
              )}

              {!loading && !loadError && (
                <>
                  <div className="dash-stats-grid">
                    {stats.map((s, i) => (
                      <div className="dash-stat-card" key={i}>
                        <div className="dash-stat-top">
                          <div className="dash-stat-icon" style={{ background: s.iconBg }}>
                            {s.icon}
                          </div>
                          {s.trend && (
                            <span className="dash-stat-trend" style={{ color: s.trendColor }}>
                              {s.trend}
                            </span>
                          )}
                        </div>
                        <div className="dash-stat-value">{s.value}</div>
                        <div className="dash-stat-label">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="dash-grid-2col">
                    <div className="dash-card">
                      <div className="dash-card-header">
                        <span className="dash-card-title">
                          <span style={{ color: "#f59e0b" }}>{icons.alert}</span> Lines Without Managers
                        </span>
                        <a href="#" className="dash-card-link" onClick={(e) => { e.preventDefault(); goToLines(); }}>
                          View All →
                        </a>
                      </div>
                      {linesWithoutManagerCount === 0 ? (
                        <div className="dash-empty-state">
                          <span className="dash-check-icon">{icons.check}</span>
                          <div className="dash-empty-title">All Lines Assigned</div>
                          <div className="dash-empty-sub">Every production line has a manager.</div>
                        </div>
                      ) : null}
                    </div>

                    <div className="dash-side-col">
                      <div className="dash-card">
                        <div className="dash-card-header">
                          <span className="dash-card-title">Quick Actions</span>
                        </div>
                        <div className="dash-actions">
                          <button className="dash-action-btn" onClick={goToManagers}>
                            <span>{icons.users} Add Manager Account</span>
                            <span>›</span>
                          </button>
                          <button className="dash-action-btn" onClick={goToLines}>
                            <span>{icons.plus} Create Production Line</span>
                            <span>›</span>
                          </button>
                        </div>
                      </div>

                      <div className="dash-card">
                        <div className="dash-card-header">
                          <span className="dash-card-title">
                            <span style={{ color: "#dc2626" }}>{icons.alert}</span> Critical Alerts
                          </span>
                        </div>

                        {criticalAlerts.length === 0 && (
                          <div style={{ fontSize: 12.5, color: "#94a3b8", padding: "10px 0" }}>
                            No critical alerts right now.
                          </div>
                        )}

                        {criticalAlerts.map((a) => (
                          <div className="dash-alert-item" key={a.id} style={{ marginBottom: 8 }}>
                            <span style={{ color: "#dc2626" }}>{icons.alert}</span>
                            <div>
                              <div className="dash-alert-title">{a.title}</div>
                              <div className="dash-alert-sub">
                                {a.job.line.name} · {a.job.productName}
                                {a.stage ? ` — ${a.stage.stageName}` : ""}
                              </div>
                              <div className="dash-alert-time">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                                </svg>
                                {timeString(a.loggedAt)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {active === "managers" && (
            <ManagerAccounts autoOpen={openManagerModal} onModalHandled={() => setOpenManagerModal(false)} />
          )}
          {active === "lines" && (
            <ProductionLines autoOpen={openLineModal} onModalHandled={() => setOpenLineModal(false)} />
          )}
          {active === "jobs" && <ActiveJobs />}
          {active === "analytics" && <HistoricalAnalytics />}
        </main>
      </div>
    </div>
  );
}