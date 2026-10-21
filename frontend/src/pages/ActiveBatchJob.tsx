import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import "./ActiveBatchJob.css";

interface ChecklistItem {
  id: string;
  itemText: string;
  isRequired: boolean;
}
interface QcQuestion {
  id: string;
  questionText: string;
  responseType: string;
  isRequired: boolean;
}
interface QuantityMetric {
  id: string;
  metricName: string;
  unitLabel: string;
  minValue: number | null;
  maxValue: number | null;
}
interface FaultCategory {
  id: string;
  faultName: string;
  severity: "MINOR" | "CRITICAL";
}

interface Snapshot {
  guidelinesEnabled: boolean;
  guidelinesContent: string | null;
  checklistEnabled: boolean;
  checklistItems: ChecklistItem[];
  quantityLoggingEnabled: boolean;
  quantities: QuantityMetric[];
  qcFormEnabled: boolean;
  qcQuestions: QcQuestion[];
  faultCategoriesEnabled: boolean;
  faultCategories: FaultCategory[];
}

interface StageDetail {
  id: string;
  jobId: string;
  stageName: string;
  status: string;
  actualStartedAt: string | null;
  blueprintSnapshot: Snapshot;
  checklistCompletions: Record<string, { checked: boolean }> | null;
  qcAnswers: Record<string, { value: any }> | null;
  notes: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "PENDING",
  AVAILABLE: "READY TO START",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
};

// Maps each backend status to a CSS modifier class so the pill's color
// reflects actual state (blue while running, amber while paused, etc.)
const STATUS_CLASS: Record<string, string> = {
  PENDING: "abj-status-pending",
  AVAILABLE: "abj-status-available",
  RUNNING: "abj-status-running",
  PAUSED: "abj-status-paused",
  COMPLETED: "abj-status-completed",
};

export default function ActiveBatchJob() {
  const location = useLocation();
  const navigate = useNavigate();
  const stageId = (location.state as { stageId?: string })?.stageId;

  const [stage, setStage] = useState<StageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [lotNumber, setLotNumber] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [quantityValues, setQuantityValues] = useState<Record<string, string>>(
    {},
  );
  const [batchNotes, setBatchNotes] = useState("");
  const [batchStatus, setBatchStatus] = useState("");

  const [qcValues, setQcValues] = useState<Record<string, string>>({});

  const [showReportFault, setShowReportFault] = useState(false);
  const [faultCategory, setFaultCategory] = useState("");
  const [faultNotes, setFaultNotes] = useState("");

  const [notes, setNotes] = useState("");
  const [showScrapModal, setShowScrapModal] = useState(false);
  const [scrapType, setScrapType] = useState("");
  const [scrapQty, setScrapQty] = useState("");
  const [scrapUnit, setScrapUnit] = useState("kg");
  const [scrapNotes, setScrapNotes] = useState("");

  const refreshStage = () => {
    if (!stageId) return;
    apiFetch(`/stages/${stageId}`)
      .then((s: StageDetail) => {
        setStage(s);
        setNotes(s.notes || "");
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    if (!stageId) {
      setError("No stage selected.");
      setLoading(false);
      return;
    }
    refreshStage();
    setLoading(false);
  }, [stageId]);

  // Derive elapsed time from actualStartedAt whenever the stage data changes,
  // instead of always starting the visible timer at 0.
  useEffect(() => {
    if (!stage) return;
    if ((stage.status === "RUNNING" || stage.status === "PAUSED") && stage.actualStartedAt) {
      const startedMs = new Date(stage.actualStartedAt).getTime();
      const nowMs = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((nowMs - startedMs) / 1000)));
    } else {
      setElapsedSeconds(0);
    }
  }, [stage?.id, stage?.status, stage?.actualStartedAt]);

  useEffect(() => {
    if (stage?.status !== "RUNNING") return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [stage?.status]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(secs % 60)
      .toString()
      .padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (error || !stage)
    return (
      <div style={{ padding: 40, color: "#dc2626" }}>
        {error || "Stage not found."}
      </div>
    );

  const snap = stage.blueprintSnapshot;
  const checklistDone = snap.checklistEnabled
    ? snap.checklistItems
        .filter((i) => i.isRequired)
        .every((i) => stage.checklistCompletions?.[i.id]?.checked)
    : true;

  const handleStart = async () => {
    try {
      await apiFetch(`/stages/${stageId}/start`, {
        method: "POST",
        body: JSON.stringify({ lotNumbers: lotNumber ? [lotNumber] : [] }),
      });
      refreshStage();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePause = async () => {
    try {
      await apiFetch(`/stages/${stageId}/pause`, { method: "POST" });
      refreshStage();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleResume = async () => {
    try {
      await apiFetch(`/stages/${stageId}/resume`, { method: "POST" });
      refreshStage();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEnd = async () => {
    try {
      await apiFetch(`/stages/${stageId}/end`, { method: "POST" });
      refreshStage();
    } catch (e: any) {
      alert(e.message + (e.outstanding ? `\n${e.outstanding.join(", ")}` : ""));
    }
  };

  const toggleChecklistItem = async (itemId: string) => {
    const currentlyChecked = !!stage.checklistCompletions?.[itemId]?.checked;
    try {
      await apiFetch(`/stages/${stageId}/checklist`, {
        method: "PATCH",
        body: JSON.stringify({ itemId, checked: !currentlyChecked }),
      });
      refreshStage();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleLogBatch = async () => {
    try {
      const res = await apiFetch(`/stages/${stageId}/batches`, {
        method: "POST",
        body: JSON.stringify({
          quantityData: quantityValues,
          notes: batchNotes,
        }),
      });
      setBatchStatus(
        res.flags?.length
          ? `Logged — flags: ${res.flags.join(", ")}`
          : "Batch logged.",
      );
      setQuantityValues({});
      setBatchNotes("");
    } catch (e: any) {
      setBatchStatus(e.message);
    }
  };

  const handleSubmitQc = async (questionId: string) => {
    try {
      await apiFetch(`/stages/${stageId}/qc`, {
        method: "POST",
        body: JSON.stringify({ questionId, value: qcValues[questionId] }),
      });
      refreshStage();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSubmitFault = async () => {
    if (!faultCategory) return;
    const cat = snap.faultCategories.find((f) => f.id === faultCategory);
    try {
      await apiFetch(`/faults`, {
        method: "POST",
        body: JSON.stringify({
          jobId: stage.jobId,
          stageId: stage.id,
          title: cat?.faultName || "Issue reported",
          description: faultNotes,
          category: cat?.faultName,
          severity: cat?.severity || "MINOR",
        }),
      });
      setShowReportFault(false);
      setFaultCategory("");
      setFaultNotes("");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await apiFetch(`/stages/${stageId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleLogScrap = async () => {
    if (!scrapType || !scrapQty) return;
    try {
      await apiFetch(`/scrap`, {
        method: "POST",
        body: JSON.stringify({
          jobId: stage.jobId,
          stageId: stage.id,
          scrapType,
          quantity: Number(scrapQty),
          unit: scrapUnit,
          notes: scrapNotes,
        }),
      });
      setShowScrapModal(false);
      setScrapType("");
      setScrapQty("");
      setScrapNotes("");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const statusClass = STATUS_CLASS[stage.status] || "abj-status-pending";

  return (
    <div className="abj-layout">
      <header className="abj-header">
        {showReportFault ? (
          <button
            className="abj-back-btn"
            onClick={() => setShowReportFault(false)}
          >
            ×
          </button>
        ) : (
          <button
            className="abj-back-btn"
            onClick={() => navigate("/operator")}
          >
            ← My Assignments
          </button>
        )}
        <div className="abj-header-right">
          <span className={`abj-status-pill ${statusClass}`}>
            {STATUS_LABEL[stage.status] || stage.status}
          </span>
          <span className="abj-timer-pill">{formatTime(elapsedSeconds)}</span>
        </div>
      </header>

      <main className="abj-content">
        <div className="abj-job-title-row">
          <h1 className="abj-job-title">{stage.stageName}</h1>
        </div>

        {showReportFault ? (
          <div className="abj-grid single">
            <div className="abj-main-col">
              <button
                className="abj-return-link"
                onClick={() => setShowReportFault(false)}
              >
                ← Return to Active Process
              </button>
              <h2 className="abj-report-title">Report Issue</h2>
              <p className="abj-report-sub">
                Log a production problem. The process keeps running while you
                report.
              </p>

              <div className="abj-card">
                <label className="abj-modal-label">Fault Category</label>
                <select
                  value={faultCategory}
                  onChange={(e) => setFaultCategory(e.target.value)}
                >
                  <option value="">Select a fault category...</option>
                  {snap.faultCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.faultName} ({c.severity})
                    </option>
                  ))}
                </select>

                <label className="abj-modal-label">Additional Notes</label>
                <textarea
                  value={faultNotes}
                  onChange={(e) => setFaultNotes(e.target.value)}
                  rows={4}
                />

                <button
                  className="abj-submit-fault-btn"
                  disabled={!faultCategory}
                  onClick={handleSubmitFault}
                >
                  Submit Issue to Control Dashboard
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="abj-grid">
            <div className="abj-main-col">
              {stage.status === "AVAILABLE" && (
                <>
                  <label className="abj-modal-label">Lot Number</label>
                  <input
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="Enter or scan lot number..."
                  />
                  <button
                    className="abj-start-process-btn"
                    onClick={handleStart}
                  >
                    ▶ Start Process
                  </button>
                </>
              )}

              {(stage.status === "RUNNING" || stage.status === "PAUSED") && (
                <div className="abj-control-row">
                  {stage.status === "RUNNING" ? (
                    <button
                      className="abj-control-btn pause"
                      onClick={handlePause}
                    >
                      ⏸ PAUSE
                    </button>
                  ) : (
                    <button
                      className="abj-control-btn resume"
                      onClick={handleResume}
                    >
                      ▶ RESUME
                    </button>
                  )}
                  <button className="abj-control-btn end" onClick={handleEnd}>
                    ■ END PROCESS
                  </button>
                </div>
              )}

              {stage.status === "COMPLETED" && (
                <div className="abj-ended-banner">✓ Process completed</div>
              )}

              {snap.guidelinesEnabled && (
                <div className="abj-card">
                  <div className="abj-card-title">📄 Operating Guidelines</div>
                  <p className="abj-guideline-text">{snap.guidelinesContent}</p>
                </div>
              )}

              {snap.checklistEnabled && (
                <div className="abj-card">
                  <div className="abj-card-title-row">
                    <div className="abj-card-title">📋 Checklist</div>
                    {checklistDone && (
                      <span className="abj-done-badge">✓ Done</span>
                    )}
                  </div>
                  <div className="abj-checklist">
                    {snap.checklistItems.map((item) => (
                      <label
                        key={item.id}
                        className={`abj-check-item ${stage.checklistCompletions?.[item.id]?.checked ? "done" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={
                            !!stage.checklistCompletions?.[item.id]?.checked
                          }
                          onChange={() => toggleChecklistItem(item.id)}
                          disabled={stage.status === "COMPLETED"}
                        />
                        <span>{item.itemText}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {snap.quantityLoggingEnabled &&
                (stage.status === "RUNNING" || stage.status === "PAUSED") && (
                  <div className="abj-card">
                    <div className="abj-card-title">🧮 Quantity Log</div>
                    {snap.quantities.map((m) => (
                      <div key={m.id}>
                        <label className="abj-modal-label">
                          {m.metricName} ({m.unitLabel})
                        </label>
                        <input
                          type="number"
                          value={quantityValues[m.metricName] || ""}
                          onChange={(e) =>
                            setQuantityValues((v) => ({
                              ...v,
                              [m.metricName]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                    <label className="abj-modal-label">Notes (optional)</label>
                    <textarea
                      value={batchNotes}
                      onChange={(e) => setBatchNotes(e.target.value)}
                      rows={2}
                    />
                    <button
                      className="abj-log-batch-btn"
                      onClick={handleLogBatch}
                    >
                      + Log Batch
                    </button>
                    {batchStatus && (
                      <div
                        style={{ fontSize: 12, marginTop: 8, color: "#64748b" }}
                      >
                        {batchStatus}
                      </div>
                    )}
                  </div>
                )}

              {snap.qcFormEnabled &&
                (stage.status === "RUNNING" || stage.status === "PAUSED") && (
                  <div className="abj-card">
                    <div className="abj-card-title">
                      🧪 Quality Control Check
                    </div>
                    {snap.qcQuestions.map((q) => (
                      <div key={q.id} style={{ marginBottom: 12 }}>
                        <label className="abj-modal-label">
                          {q.questionText}
                        </label>
                        {q.responseType === "PASS_FAIL" ? (
                          <div className="abj-toggle-row">
                            <button
                              className={`abj-toggle-btn ${stage.qcAnswers?.[q.id]?.value === "Pass" ? "active-pass" : ""}`}
                              onClick={() => {
                                setQcValues((v) => ({ ...v, [q.id]: "Pass" }));
                                handleSubmitQc(q.id);
                              }}
                            >
                              ✓ PASS
                            </button>
                            <button
                              className={`abj-toggle-btn ${stage.qcAnswers?.[q.id]?.value === "Fail" ? "active-fail" : ""}`}
                              onClick={() => {
                                setQcValues((v) => ({ ...v, [q.id]: "Fail" }));
                                handleSubmitQc(q.id);
                              }}
                            >
                              ✕ FAIL
                            </button>
                          </div>
                        ) : (
                          <input
                            value={qcValues[q.id] || ""}
                            onChange={(e) =>
                              setQcValues((v) => ({
                                ...v,
                                [q.id]: e.target.value,
                              }))
                            }
                            onBlur={() => handleSubmitQc(q.id)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

              <div className="abj-card">
                <div className="abj-card-title">📝 Operator Notes</div>
                <textarea
                  placeholder="Any observations for this process..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleSaveNotes}
                  rows={3}
                />
              </div>

              <button
                className="abj-report-fault-btn"
                onClick={() => setShowScrapModal(true)}
              >
                🗑 Log Scrap / Waste
              </button>

              {showScrapModal && (
                <div
                  className="abj-modal-overlay"
                  onClick={() => setShowScrapModal(false)}
                >
                  <div
                    className="abj-modal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="abj-modal-title">Log Scrap / Waste</div>
                    <label className="abj-modal-label">Scrap Type</label>
                    <input
                      value={scrapType}
                      onChange={(e) => setScrapType(e.target.value)}
                      placeholder="e.g. Damaged bottles"
                    />
                    <label className="abj-modal-label">Quantity</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="number"
                        value={scrapQty}
                        onChange={(e) => setScrapQty(e.target.value)}
                      />
                      <select
                        value={scrapUnit}
                        onChange={(e) => setScrapUnit(e.target.value)}
                      >
                        <option value="kg">kg</option>
                        <option value="units">units</option>
                        <option value="L">L</option>
                      </select>
                    </div>
                    <label className="abj-modal-label">Notes (optional)</label>
                    <textarea
                      value={scrapNotes}
                      onChange={(e) => setScrapNotes(e.target.value)}
                      rows={2}
                    />
                    <div className="abj-modal-actions">
                      <button
                        className="abj-secondary-btn"
                        onClick={() => setShowScrapModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="abj-primary-btn"
                        onClick={handleLogScrap}
                      >
                        Log Entry
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {snap.faultCategoriesEnabled && (
                <button
                  className="abj-report-fault-btn"
                  onClick={() => setShowReportFault(true)}
                >
                  ⚠ Report Fault / Issue
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}