import { useState, useEffect } from "react";
import { apiFetch } from "../api/client";

interface Blueprint {
  id: string;
  name: string;
  estimatedDurationMinutes: number | null;
  stationTag: string | null;
}

interface Operator {
  id: string;
  operatorName: string;
  phone: string;
}

interface PipelineStage {
  id: number;
  blueprintId: string;
  blueprintName: string;
  duration: number | null;
  station: string | null;
  operatorId: string;
}

export default function JobBuilder() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [lineId, setLineId] = useState<string | null>(null);

  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [targetOutput, setTargetOutput] = useState(1000);
  const [unit, setUnit] = useState("Units");
  const [status, setStatus] = useState("");

  useEffect(() => {
    apiFetch("/blueprints").then(setBlueprints).catch(() => {});
    apiFetch("/users/operators").then(setOperators).catch(() => {});
    apiFetch("/lines").then((lines) => {
      if (lines.length > 0) setLineId(lines[0].id);
    }).catch(() => {});
  }, []);

  const addStage = (bp: Blueprint) => {
    setPipeline((p) => [
      ...p,
      { id: Date.now(), blueprintId: bp.id, blueprintName: bp.name, duration: bp.estimatedDurationMinutes, station: bp.stationTag, operatorId: "" },
    ]);
  };

  const removeStage = (id: number) => setPipeline((p) => p.filter((s) => s.id !== id));
  const setOperator = (id: number, operatorId: string) =>
    setPipeline((p) => p.map((s) => (s.id === id ? { ...s, operatorId } : s)));

  const totalDuration = pipeline.reduce((sum, s) => sum + (s.duration || 0), 0);
  const assignedCount = pipeline.filter((s) => s.operatorId).length;

  const handleActivate = async () => {
    setStatus("");
    if (!lineId) { setStatus("No production line assigned to you yet."); return; }
    if (!jobTitle.trim()) { setStatus("Job title is required."); return; }
    if (pipeline.length === 0) { setStatus("Add at least one process stage."); return; }
    if (pipeline.some((s) => !s.operatorId)) { setStatus("Every stage needs an assigned operator."); return; }

    try {
      const job = await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify({
          lineId,
          jobId: `JOB-${Date.now().toString(36).toUpperCase()}`,
          name: jobTitle,
          productName: jobTitle,
          targetQuantity: targetOutput,
          unit,
        }),
      });

      for (let i = 0; i < pipeline.length; i++) {
        const s = pipeline[i];
        await apiFetch(`/jobs/${job.id}/stages`, {
          method: "POST",
          body: JSON.stringify({ blueprintId: s.blueprintId, operatorId: s.operatorId, stageOrder: i }),
        });
      }

      await apiFetch(`/jobs/${job.id}/activate`, { method: "PATCH" });

      setStatus(`Job "${jobTitle}" activated successfully!`);
      setPipeline([]);
      setJobTitle("");
    } catch (err: any) {
      setStatus(err.message);
    }
  };

  return (
    <>
      <h1 className="mgr-page-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
        </svg>
        Job Builder
      </h1>
      <p className="mgr-page-sub">Assemble a production job from your blueprint library.</p>

      <div className="mgr-jb-top-row">
        <div className="mgr-jb-field">
          <label>Job Title</label>
          <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Morning Pineapple Run" />
        </div>
        <div className="mgr-jb-field">
          <label>Target Output</label>
          <input type="number" value={targetOutput} onChange={(e) => setTargetOutput(Number(e.target.value))} />
        </div>
        <div className="mgr-jb-field">
          <label>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="Units">Units</option>
            <option value="Bottles">Bottles</option>
            <option value="Cups">Cups</option>
            <option value="kg">kg</option>
            <option value="L">L</option>
          </select>
        </div>
      </div>

      <div className="mgr-jb-layout">
        <div className="mgr-jb-templates">
          <div className="mgr-jb-templates-title">Process Blueprints</div>
          <div className="mgr-jb-templates-hint">Click to add to pipeline.</div>
          {blueprints.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8" }}>No blueprints yet — create one in Blueprint Library.</div>}
          {blueprints.map((bp) => (
            <button className="mgr-jb-template-btn" key={bp.id} onClick={() => addStage(bp)}>
              <div className="mgr-jb-template-name">{bp.name}</div>
              <div className="mgr-jb-template-meta">
                {bp.estimatedDurationMinutes ? `${bp.estimatedDurationMinutes} min` : "—"} · {bp.stationTag || "No station"}
              </div>
            </button>
          ))}
        </div>

        <div className="mgr-jb-pipeline">
          {pipeline.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8" }}>No stages added yet.</div>}
          {pipeline.map((stage, i) => (
            <div className="mgr-jb-stage-card" key={stage.id}>
              <div className="mgr-jb-stage-header">
                <span className="mgr-jb-stage-num">{i + 1}</span>
                <span className="mgr-jb-stage-title">{stage.blueprintName}</span>
                <button className="mgr-jb-stage-remove" onClick={() => removeStage(stage.id)}>×</button>
              </div>
              <div className="mgr-jb-stage-meta">{stage.duration ? `${stage.duration} min` : "—"} · {stage.station || "No station"}</div>

              <label className="mgr-jb-assigned-label">Assigned Operator</label>
              <select value={stage.operatorId} onChange={(e) => setOperator(stage.id, e.target.value)}>
                <option value="">Select operator...</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>{op.operatorName}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="mgr-jb-footer">
        <span>{pipeline.length} stages configured</span>
        <span className="green">{assignedCount} operators assigned</span>
        <span>Total duration: {totalDuration} min</span>
        <div className="mgr-jb-footer-actions">
          <button className="mgr-primary-btn dark" onClick={handleActivate}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            Activate Production Run
          </button>
        </div>
      </div>

      {status && <div style={{ marginTop: 14, fontSize: 13, color: status.includes("success") ? "#16a34a" : "#dc2626" }}>{status}</div>}
    </>
  );
}