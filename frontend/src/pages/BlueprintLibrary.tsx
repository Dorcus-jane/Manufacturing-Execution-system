import { useState, useEffect } from "react";
import { apiFetch } from "../api/client";

interface Blueprint {
  id?: string;
  name: string;
  category: "Preparation" | "Processing" | "Packaging" | "Quality Control";
  description: string;
  duration: string;
  station: string;
  tags: string[];
}

const categoryColors: Record<string, { bg: string; color: string }> = {
  Preparation: { bg: "#fef3c7", color: "#d97706" },
  Processing: { bg: "#dbeafe", color: "#2563eb" },
  Packaging: { bg: "#fef3c7", color: "#d97706" },
  "Quality Control": { bg: "#dcfce7", color: "#16a34a" },
};

const filterChips = ["All", "Preparation", "Processing", "Packaging", "Quality Control", "Archived"];

interface QcQuestion {
  question: string;
  type: "Pass/Fail" | "Numeric" | "Text";
  required: boolean;
}

interface FaultReason {
  reason: string;
  severity: "Minor" | "Critical";
}

interface Metric {
  label: string;
  unit: string;
}

type FeatureKey = "guidelines" | "checklist" | "quantity" | "qcform" | "faults";

export default function BlueprintLibrary() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [showPanel, setShowPanel] = useState(false);

  // 👇 FETCH BLUEPRINTS ON LOAD
  useEffect(() => {
    fetchBlueprints();
  }, []);
 
  const fetchBlueprints = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/blueprints", {
        method: "GET",
      });

      // Transform API data to match Blueprint interface
      const formattedBlueprints: Blueprint[] = data.map((bp: any) => {
        const tags: string[] = [];
        if (bp.guidelinesEnabled) tags.push("Guidelines");
        if (bp.checklistEnabled) tags.push("Checklist");
        if (bp.quantityLoggingEnabled) tags.push("Quantity");
        if (bp.qcFormEnabled) tags.push("QC Form");
        if (bp.faultCategoriesEnabled) tags.push("Faults");

        return {
          id: bp.id,
          name: bp.name,
          category: bp.category || "Processing",
          description: bp.description || "No description provided.",
          duration: bp.estimatedDurationMinutes ? `${bp.estimatedDurationMinutes} min` : "30 min",
          station: bp.stationTag || "Station",
          tags: tags.length > 0 ? tags : ["Guidelines"],
        };
      });

      setBlueprints(formattedBlueprints);
    } catch (err: any) {
      console.error("Failed to fetch blueprints:", err);
    } finally {
      setLoading(false);
    }
  };

  // Basic info
  const [processName, setProcessName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Blueprint["category"]>("Preparation");
  const [stationTag, setStationTag] = useState("");
  const [duration, setDuration] = useState("30");

  // Feature toggles + expanded state
  const [enabled, setEnabled] = useState<Record<FeatureKey, boolean>>({
    guidelines: true, checklist: true, quantity: false, qcform: false, faults: false,
  });
  const [expanded, setExpanded] = useState<Record<FeatureKey, boolean>>({
    guidelines: true, checklist: false, quantity: false, qcform: false, faults: false,
  });

  // Guidelines config
  const [instructions, setInstructions] = useState("");

  // Checklist config
  const [validationTiming, setValidationTiming] = useState<"Before Start" | "Before Completion" | "Both Stages">("Before Start");
  const [checklistItems, setChecklistItems] = useState<string[]>(["", ""]);

  // Quantity config
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: "", unit: "kg" }, { label: "", unit: "kg" }, { label: "", unit: "kg" },
  ]);

  // QC Form config
  const [qcQuestions, setQcQuestions] = useState<QcQuestion[]>([
    { question: "", type: "Pass/Fail", required: true },
    { question: "", type: "Pass/Fail", required: true },
    { question: "", type: "Pass/Fail", required: true },
  ]);

  // Fault categories config
  const [faultReasons, setFaultReasons] = useState<FaultReason[]>([
    { reason: "", severity: "Minor" },
    { reason: "", severity: "Critical" },
    { reason: "", severity: "Minor" },
  ]);

  const [error, setError] = useState("");

  const toggleFeature = (key: FeatureKey) => {
    setEnabled((f) => ({ ...f, [key]: !f[key] }));
    if (!enabled[key]) setExpanded((f) => ({ ...f, [key]: true }));
  };

  const toggleExpand = (key: FeatureKey) => {
    setExpanded((f) => ({ ...f, [key]: !f[key] }));
  };

  const resetForm = () => {
    setProcessName(""); setDescription(""); setCategory("Preparation"); setStationTag(""); setDuration("30");
    setEnabled({ guidelines: true, checklist: true, quantity: false, qcform: false, faults: false });
    setExpanded({ guidelines: true, checklist: false, quantity: false, qcform: false, faults: false });
    setInstructions("");
    setValidationTiming("Before Start");
    setChecklistItems(["", ""]);
    setMetrics([{ label: "", unit: "kg" }, { label: "", unit: "kg" }, { label: "", unit: "kg" }]);
    setQcQuestions([
      { question: "", type: "Pass/Fail", required: true },
      { question: "", type: "Pass/Fail", required: true },
      { question: "", type: "Pass/Fail", required: true },
    ]);
    setFaultReasons([{ reason: "", severity: "Minor" }, { reason: "", severity: "Critical" }, { reason: "", severity: "Minor" }]);
    setError("");
  };

  const handleClose = () => { setShowPanel(false); resetForm(); };
  
  const mapValidationTiming = (timing: string) => {
  switch (timing) {
    case "Before Start": return "BEFORE_START";
    case "Before Completion": return "BEFORE_END";
    case "Both Stages": return "BOTH";
    default: return "BEFORE_START";
  }
};

  const handleCreate = async () => {
    

    if (!processName.trim() || !stationTag.trim()) {
      setError("Process name and station tag are required.");
      return;
    }

    try {
      // Build the blueprint data matching your Prisma schema
      const blueprintData = {
        name: processName.trim(),
        description: description.trim() || "No description provided.",
        category: category,
        stationTag: stationTag.trim(),
        estimatedDurationMinutes: parseInt(duration) || 30,

        // Feature toggles
        guidelinesEnabled: enabled.guidelines,
        checklistEnabled: enabled.checklist,
        quantityLoggingEnabled: enabled.quantity,
        qcFormEnabled: enabled.qcform,
        faultCategoriesEnabled: enabled.faults,

        // Guidelines content
        guidelinesContent: enabled.guidelines ? instructions : null,

        // Checklist validation timing
        checklistValidationTiming: enabled.checklist ? mapValidationTiming(validationTiming) : null,

        // Child data
        quantities: enabled.quantity ? metrics.filter(m => m.label.trim()).map(m => ({
          metricName: m.label,
          unitLabel: m.unit,
          inputFrequency: "PER_BATCH",
          sortOrder: 0,
        })) : [],

        checklistItems: enabled.checklist ? checklistItems.filter(item => item.trim()).map((item, index) => ({
          itemText: item,
          isRequired: true,
          sortOrder: index,
        })) : [],

        qcQuestions: enabled.qcform ? qcQuestions.filter(q => q.question.trim()).map((q, index) => ({
          questionText: q.question,
          responseType: q.type === "Pass/Fail" ? "PASS_FAIL" : q.type === "Numeric" ? "NUMERIC" : "TEXT",
          isRequired: q.required,
          sortOrder: index,
        })) : [],

        faultCategories: enabled.faults ? faultReasons.filter(f => f.reason.trim()).map((f, index) => ({
          faultName: f.reason,
          severity: f.severity === "Critical" ? "CRITICAL" : "MINOR",
          sortOrder: index,
        })) : [],
      };

      

      const created = await apiFetch("/blueprints", {
        method: "POST",
        body: JSON.stringify(blueprintData),
      });

      // Add the new blueprint to the list
      const tags: string[] = [];
      if (created.guidelinesEnabled) tags.push("Guidelines");
      if (created.checklistEnabled) tags.push("Checklist");
      if (created.quantityLoggingEnabled) tags.push("Quantity");
      if (created.qcFormEnabled) tags.push("QC Form");
      if (created.faultCategoriesEnabled) tags.push("Faults");

      const newBlueprint: Blueprint = {
        id: created.id,
        name: created.name,
        category: created.category || "Processing",
        description: created.description || "No description provided.",
        duration: created.estimatedDurationMinutes ? `${created.estimatedDurationMinutes} min` : "30 min",
        station: created.stationTag || "Station",
        tags: tags.length > 0 ? tags : ["Guidelines"],
      };

      setBlueprints((prev) => [...prev, newBlueprint]);
      handleClose();
    } catch (err: any) {
      setError(err.message || "Failed to create blueprint. Please try again.");
    }
  };

  const filtered = blueprints.filter(
    (b) => (filter === "All" || b.category === filter) && b.name.toLowerCase().includes(query.toLowerCase())
  );

  // --- list helpers ---
  const updateChecklistItem = (i: number, v: string) =>
    setChecklistItems((list) => list.map((c, idx) => (idx === i ? v : c)));
  const addChecklistItem = () => setChecklistItems((list) => [...list, ""]);
  const removeChecklistItem = (i: number) => setChecklistItems((list) => list.filter((_, idx) => idx !== i));

  const updateMetric = (i: number, field: keyof Metric, v: string) =>
    setMetrics((list) => list.map((m, idx) => (idx === i ? { ...m, [field]: v } : m)));
  const addMetric = () => setMetrics((list) => [...list, { label: "", unit: "kg" }]);
  const removeMetric = (i: number) => setMetrics((list) => list.filter((_, idx) => idx !== i));

  const updateQcQuestion = (i: number, field: keyof QcQuestion, v: string | boolean) =>
    setQcQuestions((list) => list.map((q, idx) => (idx === i ? { ...q, [field]: v } : q)));
  const addQcQuestion = () => setQcQuestions((list) => [...list, { question: "", type: "Pass/Fail", required: true }]);
  const removeQcQuestion = (i: number) => setQcQuestions((list) => list.filter((_, idx) => idx !== i));

  const updateFault = (i: number, field: keyof FaultReason, v: string) =>
    setFaultReasons((list) => list.map((f, idx) => (idx === i ? { ...f, [field]: v } : f)));
  const addFault = () => setFaultReasons((list) => [...list, { reason: "", severity: "Minor" }]);
  const removeFault = (i: number) => setFaultReasons((list) => list.filter((_, idx) => idx !== i));

  return (
    <>
      <div className="mgr-page-header-row">
        <div>
          <h1 className="mgr-page-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z" />
            </svg>
            Blueprint Library
          </h1>
          <p className="mgr-page-sub">{blueprints.length} active templates · 1 archived</p>
        </div>
        <button className="mgr-primary-btn" onClick={() => setShowPanel(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create Blueprint
        </button>
      </div>

      <div className="mgr-search-wrap wide">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input placeholder="Search blueprints..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="mgr-filter-row">
        {filterChips.map((f) => (
          <button key={f} className={`mgr-filter-chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <div className="mgr-blueprint-grid">
        {loading && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            Loading blueprints...
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            No blueprints found. Create your first blueprint!
          </div>
        )}
        {!loading && filtered.map((b, i) => {
          const c = categoryColors[b.category] || categoryColors.Processing;
          return (
            <div className="mgr-blueprint-card" key={b.id || i}>
              <div className="mgr-blueprint-top">
                <span className="mgr-blueprint-name">{b.name}</span>
                <span className="mgr-blueprint-badge" style={{ background: c.bg, color: c.color }}>{b.category}</span>
              </div>
              <p className="mgr-blueprint-desc">{b.description}</p>
              <div className="mgr-blueprint-meta">
                <span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                  {b.duration}
                </span>
                <span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                  {b.station}
                </span>
              </div>
              <div className="mgr-blueprint-tags">
                {b.tags.map((t) => <span className="mgr-blueprint-tag" key={t}>{t}</span>)}
              </div>
            </div>
          );
        })}
      </div>

      {showPanel && (
        <>
          <div className="mgr-drawer-overlay" onClick={handleClose} />
          <div className="mgr-drawer">
            <div className="mgr-drawer-header">
              <div>
                <div className="mgr-drawer-title">Create Blueprint</div>
                <div className="mgr-drawer-sub">Configure stage template settings</div>
              </div>
              <button className="mgr-drawer-close" onClick={handleClose}>×</button>
            </div>

            <div className="mgr-drawer-body">
              {/* BASIC INFO */}
              <div className="mgr-drawer-section-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
                Basic Information
              </div>

              <label className="mgr-drawer-label">Process Name</label>
              <input placeholder="e.g., Mixing Tank Sterilization" value={processName} onChange={(e) => setProcessName(e.target.value)} />

              <label className="mgr-drawer-label">Description</label>
              <textarea placeholder="Brief description of this process stage..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

              <div className="mgr-drawer-row">
                <div>
                  <label className="mgr-drawer-label">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as Blueprint["category"])}>
                    <option value="Preparation">Preparation</option>
                    <option value="Processing">Processing</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Quality Control">Quality Control</option>
                  </select>
                </div>
                <div>
                  <label className="mgr-drawer-label">Station Tag</label>
                  <input placeholder="e.g., Station A" value={stationTag} onChange={(e) => setStationTag(e.target.value)} />
                </div>
                <div>
                  <label className="mgr-drawer-label">Duration (min)</label>
                  <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
              </div>

              {/* FEATURE CONFIGURATION */}
              <div className="mgr-drawer-section-title" style={{ marginTop: 24 }}>Feature Configuration</div>
              <p className="mgr-drawer-section-sub">Toggle features to enable and configure additional process controls</p>

              {/* GUIDELINES */}
              <div className={`mgr-feature-block ${enabled.guidelines ? "on" : ""}`}>
                <div className="mgr-feature-row">
                  <button className={`mgr-toggle-switch ${enabled.guidelines ? "on" : ""}`} onClick={() => toggleFeature("guidelines")}>
                    <span className="mgr-toggle-knob" />
                  </button>
                  <span className="mgr-feature-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z" />
                    </svg>
                  </span>
                  <div className="mgr-feature-text" onClick={() => enabled.guidelines && toggleExpand("guidelines")}>
                    <div className="mgr-feature-label">Guidelines</div>
                    <div className="mgr-feature-desc">Operator instructions and reference materials</div>
                  </div>
                  {enabled.guidelines && (
                    <button className="mgr-feature-chevron" onClick={() => toggleExpand("guidelines")}>
                      {expanded.guidelines ? "︿" : "﹀"}
                    </button>
                  )}
                </div>

                {enabled.guidelines && expanded.guidelines && (
                  <div className="mgr-feature-config">
                    <label className="mgr-drawer-label">Operator Instructions</label>
                    <textarea
                      placeholder="Enter detailed guidelines for operators..."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      rows={3}
                    />
                    <label className="mgr-drawer-label">Reference Images</label>
                    <div className="mgr-dropzone">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                      </svg>
                      <div className="mgr-dropzone-text">Drag & drop images or click to upload</div>
                      <div className="mgr-dropzone-sub">PNG, JPG up to 5MB each</div>
                    </div>
                  </div>
                )}
              </div>

              {/* OPERATOR CHECKLIST */}
              <div className={`mgr-feature-block ${enabled.checklist ? "on" : ""}`}>
                <div className="mgr-feature-row">
                  <button className={`mgr-toggle-switch ${enabled.checklist ? "on" : ""}`} onClick={() => toggleFeature("checklist")}>
                    <span className="mgr-toggle-knob" />
                  </button>
                  <span className="mgr-feature-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" />
                    </svg>
                  </span>
                  <div className="mgr-feature-text" onClick={() => enabled.checklist && toggleExpand("checklist")}>
                    <div className="mgr-feature-label">Operator Checklist</div>
                    <div className="mgr-feature-desc">Pre-task verification items</div>
                  </div>
                  {enabled.checklist && (
                    <button className="mgr-feature-chevron" onClick={() => toggleExpand("checklist")}>
                      {expanded.checklist ? "︿" : "﹀"}
                    </button>
                  )}
                </div>

                {enabled.checklist && expanded.checklist && (
                  <div className="mgr-feature-config">
                    <label className="mgr-drawer-label">Validation Timing</label>
                    <div className="mgr-segmented">
                      {(["Before Start", "Before Completion", "Both Stages"] as const).map((v) => (
                        <button
                          key={v}
                          className={`mgr-segmented-btn ${validationTiming === v ? "active" : ""}`}
                          onClick={() => setValidationTiming(v)}
                        >
                          {v}
                        </button>
                      ))}
                    </div>

                    <div className="mgr-list-header">
                      <label className="mgr-drawer-label" style={{ margin: 0 }}>Checklist Items</label>
                      <button className="mgr-add-link" onClick={addChecklistItem}>+ Add Item</button>
                    </div>
                    {checklistItems.map((item, i) => (
                      <div className="mgr-list-row" key={i}>
                        <input
                          placeholder="Enter checklist item..."
                          value={item}
                          onChange={(e) => updateChecklistItem(i, e.target.value)}
                        />
                        <button className="mgr-row-delete" onClick={() => removeChecklistItem(i)}>🗑</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* QUANTITY LOGGING */}
              <div className={`mgr-feature-block ${enabled.quantity ? "on" : ""}`}>
                <div className="mgr-feature-row">
                  <button className={`mgr-toggle-switch ${enabled.quantity ? "on" : ""}`} onClick={() => toggleFeature("quantity")}>
                    <span className="mgr-toggle-knob" />
                  </button>
                  <span className="mgr-feature-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 20V10M12 20V4M6 20v-6" />
                    </svg>
                  </span>
                  <div className="mgr-feature-text" onClick={() => enabled.quantity && toggleExpand("quantity")}>
                    <div className="mgr-feature-label">Quantity Logging</div>
                    <div className="mgr-feature-desc">Track material quantities and flow</div>
                  </div>
                  {enabled.quantity && (
                    <button className="mgr-feature-chevron" onClick={() => toggleExpand("quantity")}>
                      {expanded.quantity ? "︿" : "﹀"}
                    </button>
                  )}
                </div>

                {enabled.quantity && expanded.quantity && (
                  <div className="mgr-feature-config">
                    {metrics.map((m, i) => (
                      <div className="mgr-metric-row" key={i}>
                        <span className="mgr-metric-num">{i + 1}</span>
                        <div className="mgr-metric-fields">
                          <label className="mgr-drawer-label" style={{ marginTop: 0 }}>Metric Label</label>
                          <input placeholder="e.g., Raw Fruit Weight Input" value={m.label} onChange={(e) => updateMetric(i, "label", e.target.value)} />
                        </div>
                        <div className="mgr-metric-unit">
                          <label className="mgr-drawer-label" style={{ marginTop: 0 }}>Unit of Measure</label>
                          <select value={m.unit} onChange={(e) => updateMetric(i, "unit", e.target.value)}>
                            <option value="kg">kg</option>
                            <option value="L">L</option>
                            <option value="Units">Units</option>
                          </select>
                        </div>
                        <button className="mgr-row-delete" onClick={() => removeMetric(i)}>🗑</button>
                      </div>
                    ))}
                    <button className="mgr-add-dashed" onClick={addMetric}>+ Add Another Quantity Metric</button>

                    <div className="mgr-example-box">
                      <div className="mgr-example-title">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                        </svg>
                        EXAMPLE: PINEAPPLE PULPING RUN CONFIGURATION
                      </div>
                      <div className="mgr-example-row"><span>1</span> Raw Fruit Weight Input <span className="mgr-example-unit">kg</span></div>
                      <div className="mgr-example-row"><span>2</span> Pure Extracted Pulp Yield <span className="mgr-example-unit">L</span></div>
                      <div className="mgr-example-row"><span>3</span> Fibrous Scrap Material <span className="mgr-example-unit">kg</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* QUALITY CONTROL FORM */}
              <div className={`mgr-feature-block ${enabled.qcform ? "on" : ""}`}>
                <div className="mgr-feature-row">
                  <button className={`mgr-toggle-switch ${enabled.qcform ? "on" : ""}`} onClick={() => toggleFeature("qcform")}>
                    <span className="mgr-toggle-knob" />
                  </button>
                  <span className="mgr-feature-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="4" width="16" height="18" rx="2" /><path d="M9 2h6v4H9zM9 11h6M9 15h6" />
                    </svg>
                  </span>
                  <div className="mgr-feature-text" onClick={() => enabled.qcform && toggleExpand("qcform")}>
                    <div className="mgr-feature-label">Quality Control Form</div>
                    <div className="mgr-feature-desc">Inspection checkpoints and measurements</div>
                  </div>
                  {enabled.qcform && (
                    <button className="mgr-feature-chevron" onClick={() => toggleExpand("qcform")}>
                      {expanded.qcform ? "︿" : "﹀"}
                    </button>
                  )}
                </div>

                {enabled.qcform && expanded.qcform && (
                  <div className="mgr-feature-config">
                    <div className="mgr-list-header">
                      <label className="mgr-drawer-label" style={{ margin: 0 }}>Add quality inspection checkpoints</label>
                      <button className="mgr-add-link" onClick={addQcQuestion}>+ Add Question</button>
                    </div>
                    {qcQuestions.map((q, i) => (
                      <div className="mgr-qc-row" key={i}>
                        <div className="mgr-qc-row-top">
                          <input
                            placeholder="Enter inspection question..."
                            value={q.question}
                            onChange={(e) => updateQcQuestion(i, "question", e.target.value)}
                          />
                          <button className="mgr-row-delete" onClick={() => removeQcQuestion(i)}>🗑</button>
                        </div>
                        <div className="mgr-qc-row-bottom">
                          <select value={q.type} onChange={(e) => updateQcQuestion(i, "type", e.target.value)}>
                            <option value="Pass/Fail">Pass/Fail</option>
                            <option value="Numeric">Numeric</option>
                            <option value="Text">Text</option>
                          </select>
                          <label className="mgr-required-check">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) => updateQcQuestion(i, "required", e.target.checked)}
                            />
                            Required
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FAULT CATEGORIES */}
              <div className={`mgr-feature-block ${enabled.faults ? "on" : ""}`}>
                <div className="mgr-feature-row">
                  <button className={`mgr-toggle-switch ${enabled.faults ? "on" : ""}`} onClick={() => toggleFeature("faults")}>
                    <span className="mgr-toggle-knob" />
                  </button>
                  <span className="mgr-feature-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </span>
                  <div className="mgr-feature-text" onClick={() => enabled.faults && toggleExpand("faults")}>
                    <div className="mgr-feature-label">Fault Categories</div>
                    <div className="mgr-feature-desc">Predefined fault reporting options</div>
                  </div>
                  {enabled.faults && (
                    <button className="mgr-feature-chevron" onClick={() => toggleExpand("faults")}>
                      {expanded.faults ? "︿" : "﹀"}
                    </button>
                  )}
                </div>

                {enabled.faults && expanded.faults && (
                  <div className="mgr-feature-config">
                    <div className="mgr-list-header">
                      <label className="mgr-drawer-label" style={{ margin: 0 }}>Define fault reasons for this stage</label>
                      <button className="mgr-add-link" onClick={addFault}>+ Add Fault</button>
                    </div>
                    {faultReasons.map((f, i) => (
                      <div className="mgr-fault-config-row" key={i}>
                        <input
                          placeholder="e.g., Cap Feed Jam"
                          value={f.reason}
                          onChange={(e) => updateFault(i, "reason", e.target.value)}
                        />
                        <select
                          className={`mgr-severity-select ${f.severity === "Critical" ? "critical" : "minor"}`}
                          value={f.severity}
                          onChange={(e) => updateFault(i, "severity", e.target.value)}
                        >
                          <option value="Minor">Minor</option>
                          <option value="Critical">Critical</option>
                        </select>
                        <button className="mgr-row-icon">📷</button>
                        <button className="mgr-row-delete" onClick={() => removeFault(i)}>🗑</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <div className="mgr-drawer-error">{error}</div>}
            </div>

            <div className="mgr-drawer-footer">
              <button className="mgr-secondary-btn" onClick={handleClose}>Cancel</button>
              <button className="mgr-primary-btn" onClick={handleCreate}>Create Blueprint</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}