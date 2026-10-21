import { useState, useEffect } from "react";
import { apiFetch } from "../api/client";

interface Stage {
  name: string;
  operator: string;
  station: string;
  status: "COMPLETED" | "AVAILABLE" | "IN PROGRESS";
}

interface Job {
  id: string;
  jobId: string;
  name: string;
  status: "AVAILABLE" | "COMPLETED";
  product: string;
  progress: number;
  stages: number;
  stagesDone: number;
  quantity: string;
  timeline: string;
  manager: string;
  processStages: Stage[];
}

// Helper to map status from backend to frontend
const mapStatus = (status: string): "AVAILABLE" | "COMPLETED" => {
  switch (status) {
    case "ACTIVE":
    case "AVAILABLE":
      return "AVAILABLE";
    case "COMPLETED":
      return "COMPLETED";
    default:
      return "AVAILABLE";
  }
};

const mapStageStatus = (status: string): "COMPLETED" | "AVAILABLE" | "IN PROGRESS" => {
  switch (status) {
    case "COMPLETED":
      return "COMPLETED";
    case "RUNNING":
      return "IN PROGRESS";
    default:
      return "AVAILABLE";
  }
};

export default function ActiveJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 👇 FETCH JOBS ON LOAD
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/jobs", {
        method: "GET",
      });

      // Transform API data to match Job interface
      const formattedJobs: Job[] = data.map((job: any) => {
        const totalStages = job.stages?.length || 0;
        const completedStages = job.stages?.filter((s: any) => s.status === "COMPLETED").length || 0;
        const progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

        return {
          id: job.id,
          jobId: job.jobId || `JOB-${job.id.slice(0, 8).toUpperCase()}`,
          name: job.name || job.productName || "Unnamed Job",
          status: mapStatus(job.status),
          product: job.productName || "Unspecified",
          progress: progress,
          stages: totalStages,
          stagesDone: completedStages,
          quantity: `${job.targetQuantity || 0} ${job.unit || "units"}`,
          timeline: "Standard shift",
          manager: job.createdBy?.fullName || "Unassigned",
          processStages: job.stages?.map((stage: any) => ({
            name: stage.stageName || "Unnamed Stage",
            operator: stage.operator?.operatorName || stage.operator?.fullName || "Unassigned",
            station: stage.stationTag || "Station",
            status: mapStageStatus(stage.status),
          })) || [],
        };
      });

      setJobs(formattedJobs);
    } catch (err: any) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedJob = jobs.find((j) => j.id === selectedId);

  if (selectedJob) {
    return (
      <>
        <button className="dash-back-link" onClick={() => setSelectedId(null)}>
          ‹ Back to Jobs
        </button>

        <div className="dash-card dash-job-detail-header">
          <div className="dash-job-detail-top">
            <div>
              <div className="dash-job-detail-name-row">
                <span className="dash-job-detail-name">{selectedJob.name}</span>
                <span className={`dash-job-badge ${selectedJob.status === "COMPLETED" ? "completed" : "available"}`}>
                  {selectedJob.status}
                </span>
              </div>
              <div className="dash-job-detail-meta">
                Job ID: {selectedJob.jobId}
                <br />
                Product: {selectedJob.product}
              </div>
            </div>
            <div className="dash-job-detail-percent">
              <div className="dash-job-detail-percent-value">{selectedJob.progress}%</div>
              <div className="dash-job-detail-percent-label">Complete</div>
            </div>
          </div>

          <div className="dash-job-progress-track large">
            <div
              className="dash-job-progress-fill"
              style={{ width: `${selectedJob.progress}%`, opacity: selectedJob.progress > 0 ? 1 : 0 }}
            />
          </div>

          <div className="dash-job-info-grid">
            <div className="dash-job-info-cell">
              <div className="dash-job-info-label">Target Quantity</div>
              <div className="dash-job-info-value">{selectedJob.quantity}</div>
            </div>
            <div className="dash-job-info-cell">
              <div className="dash-job-info-label">Timeline</div>
              <div className="dash-job-info-value">{selectedJob.timeline}</div>
            </div>
            <div className="dash-job-info-cell">
              <div className="dash-job-info-label">Stages</div>
              <div className="dash-job-info-value">{selectedJob.stages}</div>
            </div>
            <div className="dash-job-info-cell">
              <div className="dash-job-info-label">Manager</div>
              <div className="dash-job-info-value">{selectedJob.manager}</div>
            </div>
          </div>
        </div>

        <div className="dash-process-stages-title">Process Stages</div>
        <div className="dash-stages-list">
          {selectedJob.processStages.map((stage, i) => (
            <div className={`dash-stage-row ${stage.status === "COMPLETED" ? "completed" : ""}`} key={i}>
              {stage.status === "COMPLETED" ? (
                <span className="dash-stage-check">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" />
                  </svg>
                </span>
              ) : (
                <span className="dash-stage-number">{i + 1}</span>
              )}
              <div className="dash-stage-info">
                <div className="dash-stage-name">{stage.name}</div>
                <div className="dash-stage-meta">
                  {stage.operator} · {stage.station}
                </div>
              </div>
              <span className={`dash-job-badge ${stage.status === "COMPLETED" ? "completed" : "available"}`}>
                {stage.status}
              </span>
            </div>
          ))}
        </div>
      </>
    );
  }

  const filtered = jobs.filter(
    (j) =>
      j.name.toLowerCase().includes(query.toLowerCase()) ||
      j.product.toLowerCase().includes(query.toLowerCase()) ||
      j.jobId.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <h1 className="dash-page-title">Active Jobs</h1>
      <p className="dash-page-sub">View and analyze individual production jobs.</p>

      <div className="dash-search-wrap">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          placeholder="Search jobs by name, product, or ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="dash-jobs-grid">
        {loading && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            Loading jobs...
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            No jobs found. Create your first job!
          </div>
        )}
        {!loading && filtered.map((job) => (
          <div className="dash-job-card clickable" key={job.id} onClick={() => setSelectedId(job.id)}>
            <div className="dash-job-top">
              <div className="dash-job-name-row">
                <span className="dash-job-name">{job.name}</span>
                <span className={`dash-job-badge ${job.status === "COMPLETED" ? "completed" : "available"}`}>
                  {job.status}
                </span>
              </div>
              <span className="dash-job-percent">{job.progress}%</span>
            </div>
            <div className="dash-job-product">{job.product}</div>

            <div className="dash-job-progress-track">
              <div
                className="dash-job-progress-fill"
                style={{ width: `${job.progress}%`, opacity: job.progress > 0 ? 1 : 0 }}
              />
            </div>

            <div className="dash-job-footer">
              <span>
                {job.stages} stage{job.stages !== 1 ? "s" : ""} · {job.stagesDone} done
              </span>
              {job.quantity && <span>{job.quantity}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}