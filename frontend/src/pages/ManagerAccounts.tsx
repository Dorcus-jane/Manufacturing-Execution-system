import { useState } from "react";
import { apiFetch } from "../api/client";
import { useEffect } from "react";

interface Manager {
  initials: string;
  name: string;
  email: string;
  dateCreated: string;
  lastLogin: string;
  status: "active" | "inactive";
}

const getInitials = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

export default function ManagerAccounts({
  autoOpen,
  onModalHandled,
}: {
  autoOpen?: boolean;
  onModalHandled?: () => void;
}) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true); // 👈 ADD loading state

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("manager2026");
  const [error, setError] = useState("");

  // 👇 ADD THIS: Fetch managers when component loads
  useEffect(() => {
    fetchManagers();
  }, []);

  // 👇 ADD THIS: Function to fetch managers from API
  const fetchManagers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/users/managers", {
        method: "GET",
      });
      
      // Transform API data to match Manager interface
      const formattedManagers: Manager[] = data.map((user: any) => ({
        initials: getInitials(user.fullName),
        name: user.fullName,
        email: user.email,
        dateCreated: new Date(user.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        lastLogin: user.lastLoginAt 
          ? new Date(user.lastLoginAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Never",
        status: user.isActive ? "active" : "inactive",
      }));
      
      setManagers(formattedManagers);
    } catch (err: any) {
      console.error("Failed to fetch managers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoOpen) {
      setShowModal(true);
      onModalHandled?.();
    }
  }, [autoOpen]);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("manager2026");
    setError("");
  };

  const handleClose = () => {
    setShowModal(false);
    resetForm();
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      const created = await apiFetch("/users/managers", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password }),
      });

      const newManager: Manager = {
        initials: getInitials(created.fullName),
        name: created.fullName,
        email: created.email,
        dateCreated: new Date(created.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        lastLogin: "Never",
        status: "active",
      };
      setManagers((prev) => [newManager, ...prev]);
      handleClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="dash-page-header-row">
        <div>
          <h1 className="dash-page-title">Manager Account Administration</h1>
          <p className="dash-page-sub">
            Manage registered site managers and their system access.
          </p>
        </div>
        <button className="dash-add-btn" onClick={() => setShowModal(true)}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6M22 11h-6" />
          </svg>
          Add Manager
        </button>
      </div>

      <div className="dash-card dash-table-card">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Manager Name</th>
              <th>Corporate Email</th>
              <th>Date Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {/* 👇 ADD loading state */}
            {loading && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                  Loading managers...
                </td>
              </tr>
            )}
            {!loading && managers.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: "center",
                    padding: "30px",
                    color: "#94a3b8",
                  }}
                >
                  No managers created yet.
                </td>
              </tr>
            )}
            {!loading && managers.map((m, i) => (
              <tr key={i}>
                <td>
                  <div className="dash-manager-cell">
                    <span className="dash-avatar">{m.initials}</span>
                    {m.name}
                  </div>
                </td>
                <td>{m.email}</td>
                <td>{m.dateCreated}</td>
                <td>
                  <span className={`dash-status-badge ${m.status}`}>
                    <span className="dot" />{" "}
                    {m.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="dash-modal-overlay" onClick={handleClose}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <div className="dash-modal-header-left">
                <span className="dash-modal-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                </span>
                <div>
                  <div className="dash-modal-title">Add Manager Account</div>
                  <div className="dash-modal-sub">
                    Create a new manager login
                  </div>
                </div>
              </div>
              <button className="dash-modal-close" onClick={handleClose}>
                ×
              </button>
            </div>

            <label className="dash-modal-label">Full Name *</label>
            <input
              placeholder="e.g. Nakato Aisha"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <label className="dash-modal-label">Corporate Email *</label>
            <input
              placeholder="name@dojohubug.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className="dash-modal-label">Password *</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="dash-modal-note">
              The manager will log in with this <strong>email</strong> and{" "}
              <strong>password</strong> directly.
            </div>

            {error && <div className="dash-modal-error">{error}</div>}

            <div className="dash-modal-actions">
              <button className="dash-secondary-btn" onClick={handleClose}>
                Cancel
              </button>
              <button className="dash-add-btn" onClick={handleCreate}>
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}