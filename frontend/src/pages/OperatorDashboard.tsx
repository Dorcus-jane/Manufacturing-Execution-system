import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./OperatorDashboard.css";

interface Stage {
  id: string;
  stageName: string;
  status: "PENDING" | "AVAILABLE" | "RUNNING" | "PAUSED" | "COMPLETED";
  stationTag: string | null;
  estimatedDurationMinutes: number | null;
  job: { jobId: string; productName: string; name: string | null };
}

const statusStyles: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  AVAILABLE: { bg: "#e0f2fe", color: "#0369a1", dot: "#0ea5e9", label: "AVAILABLE" },
  RUNNING: { bg: "#fef3c7", color: "#b45309", dot: "#f59e0b", label: "RUNNING" },
  PAUSED: { bg: "#fef3c7", color: "#b45309", dot: "#f59e0b", label: "PAUSED" },
  COMPLETED: { bg: "#dcfce7", color: "#15803d", dot: "#22c55e", label: "COMPLETED" },
  PENDING: { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8", label: "PENDING" },
};

// Active work (RUNNING/PAUSED) surfaces first, then things ready to pick up,
// then not-yet-available, then finished work last.
const STATUS_ORDER: Record<Stage["status"], number> = {
  RUNNING: 0,
  PAUSED: 1,
  AVAILABLE: 2,
  PENDING: 3,
  COMPLETED: 4,
};

type FilterTab = "ALL" | "ACTIVE" | "AVAILABLE" | "COMPLETED";

// Adjust this if your socket server runs on a different host/port than the REST API.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const station = (location.state as { station?: string })?.station || "Floor";

  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");

  const [emergencyStop, setEmergencyStop] = useState<{ message: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchStages = (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    return apiFetch("/stages/mine")
      .then(setStages)
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchStages();
  }, []);

  // Real-time channel — Section 4.2.1: Operator socket joins a line-scoped room
  // plus a private room keyed to their own user id for Emergency Stop broadcasts
  // and fault resolution notices.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("stage:updated", () => fetchStages());

    socket.on("fault:resolved", (payload: { title?: string }) => {
      setToast(`Fault resolved: ${payload?.title || "an issue you reported"}`);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 6000);
    });

    socket.on("emergency:stop", (payload: { message?: string }) => {
      setEmergencyStop({ message: payload?.message || "Emergency Stop activated. Hold current position." });
    });

    socket.on("emergency:resume", () => {
      setEmergencyStop(null);
      fetchStages();
    });

    return () => {
      socket.disconnect();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const filteredStages = useMemo(() => {
    let list = [...stages];

    if (filter === "ACTIVE") list = list.filter((s) => s.status === "RUNNING" || s.status === "PAUSED");
    if (filter === "AVAILABLE") list = list.filter((s) => s.status === "AVAILABLE" || s.status === "PENDING");
    if (filter === "COMPLETED") list = list.filter((s) => s.status === "COMPLETED");

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.job.jobId.toLowerCase().includes(q) ||
          s.job.productName.toLowerCase().includes(q) ||
          s.stageName.toLowerCase().includes(q) ||
          (s.job.name || "").toLowerCase().includes(q),
      );
    }

    return list.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [stages, filter, search]);

  const activeCount = stages.filter((s) => s.status === "RUNNING" || s.status === "PAUSED").length;

  const handleLogout = () => {
    socketRef.current?.disconnect();
    logout?.();
    navigate("/login/operator");
  };

  return (
    <div className="op-layout">
      {emergencyStop && (
        <div className="op-emergency-banner" role="alert">
          <span className="op-emergency-icon">⛔</span>
          <div>
            <div className="op-emergency-title">EMERGENCY STOP</div>
            <div className="op-emergency-message">{emergencyStop.message}</div>
          </div>
        </div>
      )}

      {toast && <div className="op-toast">{toast}</div>}

      <header className="op-header">
        <div className="op-brand">
          <div className="op-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div>
            <div className="op-brand-name">Dojo Hub</div>
            <div className="op-brand-sub">{user?.operatorName || "Operator"} · {station}</div>
          </div>
        </div>

        <div className="op-header-actions">
          <button
            className="op-refresh-btn"
            onClick={() => fetchStages(true)}
            disabled={refreshing}
            aria-label="Refresh assignments"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ animation: refreshing ? "op-spin 0.8s linear infinite" : "none" }}>
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
          <button className="op-logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="op-content">
        <div className="op-content-header">
          <h1 className="op-title">My Assignments</h1>
          <span className="op-active-count">{activeCount} active</span>
        </div>

        <div className="op-search-row">
          <input
            className="op-search-input"
            type="text"
            placeholder="Search job, product, or task..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="op-filter-tabs">
          {(["ALL", "ACTIVE", "AVAILABLE", "COMPLETED"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              className={`op-filter-tab ${filter === tab ? "active" : ""}`}
              onClick={() => setFilter(tab)}
            >
              {tab === "ALL" ? "All" : tab === "ACTIVE" ? "In Progress" : tab === "AVAILABLE" ? "To Do" : "Done"}
            </button>
          ))}
        </div>

        {loading && <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading assignments...</div>}

        {!loading && filteredStages.length === 0 && (
          <div className="op-empty-state">
            {stages.length === 0
              ? "No process entries assigned to you yet."
              : "Nothing matches your search or filter."}
          </div>
        )}

        <div className="op-grid">
          {filteredStages.map((stage) => {
            const s = statusStyles[stage.status];
            return (
              <div className="op-card" key={stage.id}>
                <div className="op-card-top">
                  <span className="op-job-id">{stage.job.jobId}</span>
                  <span className="op-product">· {stage.job.productName}</span>
                </div>

                <div className="op-task-name">{stage.stageName}</div>
                <div className="op-order-name">{stage.job.name || stage.job.productName}</div>

                <div className="op-meta-row">
                  <span>{stage.stationTag || "No station"}</span>
                  <span>{stage.estimatedDurationMinutes ? `~${stage.estimatedDurationMinutes} min` : "—"}</span>
                </div>

                <button
                  className="op-status-btn"
                  style={{ background: s.bg, color: s.color }}
                  onClick={() => navigate("/operator/batch", { state: { stageId: stage.id, station } })}
                >
                  <span className="op-status-dot" style={{ background: s.dot }} />
                  {s.label}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: "auto" }}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}