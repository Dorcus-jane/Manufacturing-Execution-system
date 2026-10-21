import { useState, useEffect } from "react";
import { apiFetch } from "../api/client";

interface Operator {
  initials: string;
  name: string;
  registered: string;
  phone: string;
  skills: string[];
  status: "Active" | "Suspended";
}

const skillOptions = [
  "Pasteurization", "Blender Ops", "Filling", "Capping",
  "Labeling", "Packaging", "QC Certified", "Washing",
  "Pulping", "Mixing", "Maintenance", "Lab Testing",
  "All Stations", "Sorting",
];

const getInitials = (fullName: string) =>
  fullName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");

export default function OperatorRoster() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true); // 👈 ADD loading state

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [error, setError] = useState("");

  // 👇 ADD THIS: Fetch operators when component loads
  useEffect(() => {
    fetchOperators();
  }, []);

  // 👇 ADD THIS: Function to fetch operators from API
  const fetchOperators = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/users/operators", {
        method: "GET",
      });

      const formattedOperators: Operator[] = data.map((user: any) => {
        const displaySkills =
          user.skills?.length > 2 
            ? [...user.skills.slice(0, 2), `+${user.skills.length - 2}`] 
            : user.skills || [];

        return {
          initials: getInitials(user.operatorName || user.fullName),
          name: user.operatorName || user.fullName,
          registered: new Date(user.createdAt).toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
          }),
          phone: user.phone,
          skills: displaySkills,
          status: user.isActive !== false ? "Active" : "Suspended",
        };
      });

      setOperators(formattedOperators);
    } catch (err: any) {
      console.error("Failed to fetch operators:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  };

  const resetForm = () => {
    setFullName(""); setPhone(""); setPin(""); setConfirmPin(""); setSelectedSkills([]); setError("");
  };

  const handleClose = () => { setShowModal(false); resetForm(); };

  const handleCreate = async () => {
    if (!fullName.trim() || !phone.trim()) { 
      setError("Full name and phone number are required."); 
      return; 
    }
    if (!/^\d{4}$/.test(pin)) { 
      setError("PIN must be exactly 4 digits."); 
      return; 
    }
    if (pin !== confirmPin) { 
      setError("PINs do not match."); 
      return; 
    }
    if (selectedSkills.length === 0) { 
      setError("Select at least one skill certification."); 
      return; 
    }

    try {
      const created = await apiFetch("/users/operators", {
        method: "POST",
        body: JSON.stringify({ 
          operatorName: fullName, 
          phone, 
          pin, 
          skills: selectedSkills 
        }),
      });

      const displaySkills =
        created.skills?.length > 2 
          ? [...created.skills.slice(0, 2), `+${created.skills.length - 2}`] 
          : created.skills || [];

      const newOperator: Operator = {
        initials: getInitials(created.operatorName || created.fullName),
        name: created.operatorName || created.fullName,
        registered: new Date(created.createdAt).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
        }),
        phone: created.phone,
        skills: displaySkills,
        status: "Active",
      };
      setOperators((prev) => [newOperator, ...prev]);
      handleClose();
    } catch (err: any) {
      setError(err.message || "Failed to create operator. Please try again.");
    }
  };

  const filtered = operators.filter(
    (o) =>
      o.name.toLowerCase().includes(query.toLowerCase()) ||
      o.phone.includes(query) ||
      o.skills.some((s) => s.toLowerCase().includes(query.toLowerCase()))
  );
  const activeCount = operators.filter((o) => o.status === "Active").length;
  const suspendedCount = operators.length - activeCount;

  return (
    <>
      <div className="mgr-page-header-row">
        <div>
          <h1 className="mgr-page-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            Operator Directory
          </h1>
          <p className="mgr-page-sub">{activeCount} active · {suspendedCount} suspended</p>
        </div>
        <button className="mgr-primary-btn" onClick={() => setShowModal(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Register Operator
        </button>
      </div>

      <div className="mgr-search-wrap wide">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input 
          placeholder="Search by name, phone, or skill..." 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
        />
      </div>

      <div className="mgr-card mgr-table-card">
        <table className="mgr-table">
          <thead>
            <tr>
              <th>Operator</th>
              <th>Phone / Login</th>
              <th>Skills</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {/* 👇 ADD loading state */}
            {loading && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                  Loading operators...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                  No operators registered yet.
                </td>
              </tr>
            )}
            {!loading && filtered.map((o, i) => (
              <tr key={i}>
                <td>
                  <div className="mgr-op-cell">
                    <span className="mgr-avatar small">{o.initials}</span>
                    <div>
                      <div className="mgr-op-name">{o.name}</div>
                      <div className="mgr-op-registered">Registered {o.registered}</div>
                    </div>
                  </div>
                </td>
                <td>{o.phone}</td>
                <td>
                  <div className="mgr-skills-cell">
                    {o.skills.map((s, si) => <span className="mgr-skill-tag" key={si}>{s}</span>)}
                  </div>
                </td>
                <td>
                  <span className={`mgr-status-badge ${o.status === "Active" ? "active" : "suspended"}`}>
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="mgr-modal-overlay" onClick={handleClose}>
          <div className="mgr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mgr-modal-header">
              <div className="mgr-modal-header-left">
                <span className="mgr-modal-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                  </svg>
                </span>
                <div>
                  <div className="mgr-modal-title">Register New Operator</div>
                  <div className="mgr-modal-sub">Saved to database — persists across sessions</div>
                </div>
              </div>
              <button className="mgr-modal-close" onClick={handleClose}>×</button>
            </div>

            <label className="mgr-modal-label">Full Name *</label>
            <input 
              placeholder="Operator full name" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
            />

            <label className="mgr-modal-label">Phone Number (Login ID) *</label>
            <input 
              placeholder="+256 700 000000" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
            />

            <div className="mgr-modal-row-2">
              <div>
                <label className="mgr-modal-label">4-Digit PIN *</label>
                <input 
                  placeholder="XXXX" 
                  maxLength={4} 
                  value={pin} 
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} 
                />
              </div>
              <div>
                <label className="mgr-modal-label">Confirm PIN *</label>
                <input 
                  placeholder="XXXX" 
                  maxLength={4} 
                  value={confirmPin} 
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} 
                />
              </div>
            </div>

            <label className="mgr-modal-label">Skill Certifications</label>
            <div className="mgr-skill-chip-grid">
              {skillOptions.map((skill) => (
                <button
                  key={skill}
                  className={`mgr-skill-chip-btn ${selectedSkills.includes(skill) ? "active" : ""}`}
                  onClick={() => toggleSkill(skill)}
                  type="button"
                >
                  {skill}
                </button>
              ))}
            </div>

            {error && <div className="mgr-modal-error">{error}</div>}

            <div className="mgr-modal-actions">
              <button className="mgr-secondary-btn" onClick={handleClose}>Cancel</button>
              <button className="mgr-primary-btn" onClick={handleCreate}>Create Account</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}