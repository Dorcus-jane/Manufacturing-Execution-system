import { useState, useEffect, type JSX } from "react";
import { apiFetch } from "../api/client";

interface Manager {
  id: string;
  fullName: string;
  email: string;
}

interface Line {
  id?: string;
  code: string;
  name: string;
  status: "Active" | "Maintenance";
  description: string;
  productLabel: string;
  productValue: string;
  manager?: { initials: string; name: string; email: string };
  created: string;
}

const statIcons: Record<string, JSX.Element> = {
  activity: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  layers: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5" />
    </svg>
  ),
};

const getInitials = (fullName: string) =>
  fullName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");

const nextLineCode = (lines: Line[]) => {
  const letters = lines.map((l) => l.code.replace("LINE-", ""));
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const letter of alphabet) {
    if (!letters.includes(letter)) return `LINE-${letter}`;
  }
  return `LINE-${lines.length + 1}`;
};

export default function ProductionLines({ autoOpen, onModalHandled }: { autoOpen?: boolean; onModalHandled?: () => void }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // 👇 FETCH LINES ON LOAD
  useEffect(() => {
    fetchLines();
    fetchManagers();
  }, []);

  // 👇 FETCH LINES FROM BACKEND
  const fetchLines = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/lines", {
        method: "GET",
      });

      const formattedLines: Line[] = data.map((line: any) => ({
        id: line.id,
        code: line.lineCode,
        name: line.name,
        status: line.isActive ? "Active" : "Maintenance",
        description: line.description || "No description provided.",
        productLabel: "Default Product",
        productValue: line.targetProduct || "Unspecified",
        manager: line.manager ? {
          initials: getInitials(line.manager.fullName),
          name: line.manager.fullName,
          email: line.manager.email,
        } : undefined,
        created: new Date(line.createdAt).toLocaleDateString(),
      }));

      setLines(formattedLines);
    } catch (err: any) {
      console.error("Failed to fetch lines:", err);
    } finally {
      setLoading(false);
    }
  };

  // 👇 FETCH MANAGERS
  const fetchManagers = async () => {
    try {
      const data = await apiFetch("/users/managers", {
        method: "GET",
      });
      setManagers(data);
    } catch (err: any) {
      console.error("Failed to fetch managers:", err);
    }
  };

  useEffect(() => {
    if (autoOpen) {
      setShowModal(true);
      onModalHandled?.();
    }
  }, [autoOpen]);

  const [lineName, setLineName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultProduct, setDefaultProduct] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [error, setError] = useState("");

  const suggestedCode = nextLineCode(lines);

  // 👇 Remove this useEffect since we're already fetching in main useEffect
  // useEffect(() => {
  //   if (showModal) {
  //     apiFetch("/users/managers").then(setManagers).catch(() => {});
  //   }
  // }, [showModal]);

  const resetForm = () => {
    setLineName(""); setDescription(""); setDefaultProduct(""); setSelectedManagerId(""); setError("");
  };

  const handleClose = () => { setShowModal(false); resetForm(); };

  const handleCreate = async () => {
    if (!lineName.trim() || !selectedManagerId) {
      setError("Line name and manager are required.");
      return;
    }

    try {
      const created = await apiFetch("/lines", {
        method: "POST",
        body: JSON.stringify({
          lineCode: suggestedCode,
          name: lineName,
          description,
          targetProduct: defaultProduct || "Unspecified",
          managerId: selectedManagerId,
        }),
      });

      const manager = managers.find((m) => m.id === selectedManagerId);
      const newLine: Line = {
        id: created.id,
        code: created.lineCode,
        name: created.name,
        status: "Active",
        description: created.description || "No description provided.",
        productLabel: "Default Product",
        productValue: created.targetProduct || "Unspecified",
        manager: manager ? { initials: getInitials(manager.fullName), name: manager.fullName, email: manager.email } : undefined,
        created: new Date(created.createdAt).toLocaleDateString(),
      };
      
      // 👇 Add to list and keep it sorted
      setLines((prev) => [...prev, newLine]);
      handleClose();
    } catch (err: any) {
      setError(err.message || "Failed to create line. Please try again.");
    }
  };

  const activeCount = lines.filter((l) => l.status === "Active").length;

  const stats = [
    { label: "Active Lines", value: activeCount, icon: "activity", color: "#16a34a", bg: "#dcfce7" },
    { label: "Total Lines", value: lines.length, icon: "layers", color: "#475569", bg: "#f1f5f9" },
  ];

  return (
    <>
      <div className="dash-page-header-row">
        <div>
          <h1 className="dash-page-title">Production Lines</h1>
          <p className="dash-page-sub">Manage manufacturing lines and assign managers ({lines.length}/10 lines).</p>
        </div>
        <button className="dash-add-btn green" onClick={() => setShowModal(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Line
        </button>
      </div>

      <div className="dash-stats-grid">
        {stats.map((s, i) => (
          <div className="dash-stat-card compact" key={i}>
            <div className="dash-stat-icon" style={{ background: s.bg, color: s.color }}>
              {statIcons[s.icon]}
            </div>
            <div>
              <div className="dash-stat-value">{s.value}</div>
              <div className="dash-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-lines-grid">
        {loading && (
          <div style={{ color: "#94a3b8", fontSize: 13, padding: "20px 0" }}>Loading production lines...</div>
        )}
        {!loading && lines.length === 0 && (
          <div style={{ color: "#94a3b8", fontSize: 13, padding: "20px 0" }}>No production lines created yet.</div>
        )}
        {!loading && lines.map((line, i) => (
          <div className="dash-line-card" key={line.id || i}>
            <div className="dash-line-top">
              <span className="dash-line-icon ok">{statIcons.activity}</span>
              <span className={`dash-status-badge ${line.status === "Active" ? "active" : "inactive"}`}>
                <span className="dot" /> {line.status}
              </span>
            </div>
            <div className="dash-line-code">{line.code}</div>
            <div className="dash-line-name">{line.name}</div>
            <p className="dash-line-desc">{line.description}</p>

            <div className="dash-line-product">
              <div className="dash-line-field-label">{line.productLabel}</div>
              <div className="dash-line-product-value">{line.productValue}</div>
            </div>

            <div className="dash-line-field-label">Assigned Manager</div>
            {line.manager ? (
              <div className="dash-line-manager">
                <span className="dash-avatar small">{line.manager.initials}</span>
                <div>
                  <div className="dash-line-manager-name">{line.manager.name}</div>
                  <div className="dash-line-manager-email">{line.manager.email}</div>
                </div>
              </div>
            ) : (
              <div className="dash-line-manager unassigned">No manager assigned</div>
            )}

            <div className="dash-line-created">Created {line.created}</div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="dash-modal-overlay" onClick={handleClose}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <div className="dash-modal-header-left">
                <span className="dash-modal-icon green">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <div>
                  <div className="dash-modal-title">Create Production Line</div>
                  <div className="dash-modal-sub">Provision a new manufacturing line</div>
                </div>
              </div>
              <button className="dash-modal-close" onClick={handleClose}>×</button>
            </div>

            <label className="dash-modal-label">Line Code</label>
            <input value={suggestedCode} disabled />

            <label className="dash-modal-label">Line Name *</label>
            <input placeholder="e.g. Line A — Tropical Pulping" value={lineName} onChange={(e) => setLineName(e.target.value)} />

            <label className="dash-modal-label">Description (optional)</label>
            <textarea
              placeholder="e.g. Primary washing, sorting, and extraction line..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />

            <label className="dash-modal-label">Default Product</label>
            <input
              placeholder="e.g. Mango Concentrate"
              value={defaultProduct}
              onChange={(e) => setDefaultProduct(e.target.value)}
            />

            <label className="dash-modal-label">Assign Manager *</label>
            <select value={selectedManagerId} onChange={(e) => setSelectedManagerId(e.target.value)}>
              <option value="">Select a manager...</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.fullName} ({m.email})</option>
              ))}
            </select>
            {managers.length === 0 && (
              <div className="dash-modal-note" style={{ marginTop: 8 }}>
                No managers found — create a Manager account first.
              </div>
            )}

            {error && <div className="dash-modal-error">{error}</div>}

            <div className="dash-modal-actions">
              <button className="dash-secondary-btn" onClick={handleClose}>Cancel</button>
              <button className="dash-add-btn green" onClick={handleCreate}>Create Line</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}