import { useState, useEffect, type JSX } from "react";
import { apiFetch } from "../api/client";
import { exportToCsv } from "../utils/csvExport";

interface JobHistoryRow {
  jobId: string;
  lineName: string;
  productName: string;
  targetQuantity: number;
  unit: string;
  completionDate: string | null;
  status: string;
  stageBreakdown: { stageName: string; status: string; durationMinutes: number | null }[];
}

interface FaultCategoryRow {
  category: string;
  frequency: number;
  minor: number;
  critical: number;
}

interface FaultAnalyticsData {
  totalFaults: number;
  minorCount: number;
  criticalCount: number;
  byCategory: FaultCategoryRow[];
}

interface ScrapRow {
  lineName: string;
  process: string;
  scrapType: string;
  quantity: number;
  unit: string;
  jobId: string;
  loggedAt: string;
}

interface OperatorRow {
  name: string;
  entriesCompleted: number;
  avgActualDurationMinutes: number | null;
  avgBlueprintEstimateMinutes: number | null;
  totalFaultsLogged: number;
}

const tabs = [
  { key: "timelines", label: "Job Timelines", icon: "clock" },
  { key: "downtime", label: "Downtime & Faults", icon: "alert" },
  { key: "scrap", label: "Scrap Tracking", icon: "trash" },
  { key: "operator", label: "Operator Output", icon: "user" },
];

const tabIcons: Record<string, JSX.Element> = {
  clock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  ),
  alert: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" />
    </svg>
  ),
  user: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function HistoricalAnalytics() {
  const [activeTab, setActiveTab] = useState("timelines");
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const [jobs, setJobs] = useState<JobHistoryRow[]>([]);
  const [faultData, setFaultData] = useState<FaultAnalyticsData | null>(null);
  const [scrap, setScrap] = useState<ScrapRow[]>([]);
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = () => {
    setLoading(true);
    setError("");
    const qs = `?from=${from}&to=${to}`;
    Promise.all([
      apiFetch(`/stats/jobs${qs}`),
      apiFetch(`/stats/faults${qs}`),
      apiFetch(`/stats/scrap${qs}`),
      apiFetch(`/stats/operators`),
    ])
      .then(([jobsData, faultsData, scrapData, operatorsData]) => {
        setJobs(jobsData);
        setFaultData(faultsData);
        setScrap(scrapData);
        setOperators(operatorsData);
      })
      .catch((e) => setError(e.message || "Failed to load analytics data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = () => {
    if (activeTab === "timelines") {
      exportToCsv(
        "job-history.csv",
        jobs.map((j) => ({
          "Job ID": j.jobId,
          "Production Line": j.lineName,
          "Product Name": j.productName,
          "Target Qty": j.targetQuantity,
          Unit: j.unit,
          "Completion Date": fmtDate(j.completionDate),
          Status: j.status,
        }))
      );
    } else if (activeTab === "downtime") {
      exportToCsv(
        "fault-analytics.csv",
        (faultData?.byCategory || []).map((c) => ({
          "Fault Category": c.category,
          Frequency: c.frequency,
          Minor: c.minor,
          Critical: c.critical,
        }))
      );
    } else if (activeTab === "scrap") {
      exportToCsv(
        "scrap-tracking.csv",
        scrap.map((s) => ({
          "Production Line": s.lineName,
          Process: s.process,
          "Scrap Type": s.scrapType,
          Quantity: s.quantity,
          Unit: s.unit,
          "Job ID": s.jobId,
          "Logged At": new Date(s.loggedAt).toLocaleString(),
        }))
      );
    } else if (activeTab === "operator") {
      exportToCsv(
        "operator-output.csv",
        operators.map((o) => ({
          "Operator Name": o.name,
          "Entries Completed": o.entriesCompleted,
          "Avg Actual Duration (min)": o.avgActualDurationMinutes ?? "—",
          "Avg Blueprint Estimate (min)": o.avgBlueprintEstimateMinutes ?? "—",
          "Total Faults Logged": o.totalFaultsLogged,
        }))
      );
    }
  };

  const maxFrequency = Math.max(1, ...(faultData?.byCategory.map((c) => c.frequency) || [1]));

  return (
    <>
      <h1 className="dash-page-title">Historical Data Analytics</h1>
      <p className="dash-page-sub">Comprehensive production analytics and reporting engine.</p>

      <div className="dash-filters-row">
        <div className="dash-filters-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          <span className="dash-filters-label">Filters:</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="dash-date-input" />
          <span>to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="dash-date-input" />
          <button className="dash-secondary-btn" onClick={loadData} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
        <button className="dash-export-btn" onClick={handleExport}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export to CSV
        </button>
      </div>

      <div className="dash-tabs-row">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`dash-tab-btn ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {tabIcons[t.icon]} {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="dash-card" style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
          Loading analytics...
        </div>
      )}

      {!loading && error && (
        <div className="dash-card" style={{ textAlign: "center", padding: "40px 0", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {!loading && !error && activeTab === "timelines" && (
        <div className="dash-card dash-table-card">
          {jobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
              No completed or cancelled jobs in this date range.
            </div>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Job ID</th>
                  <th>Production Line</th>
                  <th>Product Name</th>
                  <th>Target Qty</th>
                  <th>Completion Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <>
                    <tr key={j.jobId} style={{ cursor: "pointer" }} onClick={() => setExpandedJob(expandedJob === j.jobId ? null : j.jobId)}>
                      <td className="dash-job-id-cell" style={{ transform: expandedJob === j.jobId ? "rotate(90deg)" : "none" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </td>
                      <td className="dash-job-id-cell">{j.jobId}</td>
                      <td>{j.lineName}</td>
                      <td>{j.productName}</td>
                      <td>{j.targetQuantity.toLocaleString()} {j.unit}</td>
                      <td>{fmtDate(j.completionDate)}</td>
                      <td>
                        <span className={`dash-status-badge ${j.status === "COMPLETED" ? "active" : "cancelled"}`}>
                          {j.status === "COMPLETED" ? "Completed" : "Cancelled"}
                        </span>
                      </td>
                    </tr>
                    {expandedJob === j.jobId && (
                      <tr>
                        <td></td>
                        <td colSpan={6} style={{ background: "#f8fafc" }}>
                          <div style={{ padding: "10px 0" }}>
                            {j.stageBreakdown.map((s, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                                <span>{s.stageName}</span>
                                <span style={{ color: "#64748b" }}>
                                  {s.durationMinutes !== null ? `${s.durationMinutes} min` : "—"} · {s.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
          <p className="dash-table-footnote">Click a row to see the per-stage duration breakdown.</p>
        </div>
      )}

      {!loading && !error && activeTab === "downtime" && faultData && (
        <div className="dash-grid-2col">
          <div className="dash-card">
            <div className="dash-card-title" style={{ marginBottom: 16 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
              Fault Frequency by Category
            </div>
            {faultData.byCategory.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: 12.5 }}>No faults logged in this date range.</div>
            ) : (
              <div className="dash-downtime-bars">
                {faultData.byCategory.map((c, i) => (
                  <div className="dash-downtime-bar-row" key={i}>
                    <div className="dash-downtime-bar-label-row">
                      <span>{c.category}</span>
                      <span className="dash-downtime-bar-value">{c.frequency}</span>
                    </div>
                    <div className="dash-downtime-bar-track">
                      <div
                        className={`dash-downtime-bar-fill ${c.critical > 0 ? "critical" : "minor"}`}
                        style={{ width: `${(c.frequency / maxFrequency) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dash-card dash-table-card">
            <div className="dash-card-title" style={{ padding: "18px 18px 0" }}>
              Fault Breakdown ({faultData.totalFaults} total — {faultData.minorCount} Minor, {faultData.criticalCount} Critical)
            </div>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Fault Category</th>
                  <th>Frequency</th>
                  <th>Minor</th>
                  <th>Critical</th>
                </tr>
              </thead>
              <tbody>
                {faultData.byCategory.map((c, i) => (
                  <tr key={i}>
                    <td>{c.category}</td>
                    <td>{c.frequency}</td>
                    <td>{c.minor}</td>
                    <td>
                      {c.critical > 0 ? (
                        <span className="dash-severity-badge critical">⊘ {c.critical}</span>
                      ) : (
                        "0"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && activeTab === "scrap" && (
        <div className="dash-card dash-table-card">
          <div className="dash-card-title" style={{ padding: "18px 18px 0" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" />
            </svg>
            Scrap & Waste Tracking
          </div>
          {scrap.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
              No scrap logged in this date range.
            </div>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Production Line</th>
                  <th>Process</th>
                  <th>Quantity Wasted</th>
                  <th>Waste Type</th>
                  <th>Job ID</th>
                </tr>
              </thead>
              <tbody>
                {scrap.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: "#0f172a" }}>{s.lineName}</td>
                    <td>{s.process}</td>
                    <td style={{ fontWeight: 700, color: "#0f172a" }}>{s.quantity} {s.unit}</td>
                    <td><span className="dash-waste-tag">{s.scrapType}</span></td>
                    <td>{s.jobId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && !error && activeTab === "operator" && (
        <>
          <div className="dash-operator-summary-banner">
            <div className="dash-card-title" style={{ color: "#fff", marginBottom: 6 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Operator Output Summary
            </div>
            <p>Objective metrics for operator task completion and fault logging. This view displays raw operational data without evaluative rankings or scores.</p>
          </div>

          <div className="dash-card dash-table-card">
            {operators.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>No operators registered yet.</div>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Operator Name</th>
                    <th>Entries Completed</th>
                    <th>Avg. Actual Duration</th>
                    <th>Avg. Blueprint Estimate</th>
                    <th>Total Faults Logged</th>
                  </tr>
                </thead>
                <tbody>
                  {operators.map((o, i) => (
                    <tr key={i}>
                      <td>
                        <div className="dash-manager-cell">
                          <span className="dash-avatar small">
                            {o.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "OP"}
                          </span>
                          {o.name}
                        </div>
                      </td>
                      <td>{o.entriesCompleted}</td>
                      <td>{o.avgActualDurationMinutes !== null ? `${o.avgActualDurationMinutes} min` : "—"}</td>
                      <td>{o.avgBlueprintEstimateMinutes !== null ? `${o.avgBlueprintEstimateMinutes} min` : "—"}</td>
                      <td>{o.totalFaultsLogged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}