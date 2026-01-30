import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const defaultForm = {
    title: "",
    description: "",
    level: "DISTRICT",
    candidateRegistrationLastDate: "",
    electionStart: "",
    electionEnd: "",
    status: "DRAFT"
};

function AdminHome() {
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem("token"), []);
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const [elections, setElections] = useState([]);
    const [status, setStatus] = useState({ type: "", message: "" });

    const handleLogout = () => {
        try {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
        } finally {
            navigate("/login", { replace: true });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const fetchElections = async () => {
        if (!token) {
            setListLoading(false);
            return;
        }

        try {
            const { data } = await axios.get(`${API_BASE}/elections`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Handle both direct array response and nested data structure
            const electionsArray = Array.isArray(data) ? data : (data.data || data.elections || []);
            setElections(electionsArray);
        } catch (err) {
            setStatus({
                type: "error",
                message: err.response?.data?.message || "Could not load elections."
            });
            setElections([]);
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        fetchElections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const validateDates = () => {
        const start = new Date(form.electionStart);
        const end = new Date(form.electionEnd);
        const reg = new Date(form.candidateRegistrationLastDate);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(reg.getTime())) {
            return "Please provide all dates.";
        }
        if (reg > start) {
            return "Registration must close on or before the start date.";
        }
        if (end <= start) {
            return "End date must be after the start date.";
        }
        return "";
    };

    const submitElection = async (targetStatus) => {
        if (!token) {
            setStatus({ type: "error", message: "Please sign in as an admin to continue." });
            return;
        }

        const dateIssue = validateDates();
        if (dateIssue) {
            setStatus({ type: "error", message: dateIssue });
            return;
        }

        setSaving(true);
        setStatus({ type: "", message: "" });

        const payload = {
            ...form,
            status: targetStatus
        };

        try {
            await axios.post(`${API_BASE}/elections`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setStatus({
                type: "success",
                message: targetStatus === "DRAFT" ? "Election saved as draft." : "Election published as upcoming."
            });
            setForm((prev) => ({ ...defaultForm, level: prev.level }));
            fetchElections();
        } catch (err) {
            setStatus({
                type: "error",
                message: err.response?.data?.message || "Could not create election."
            });
        } finally {
            setSaving(false);
        }
    };

    const statusClass = status.type === "success" ? "status success" : status.type === "error" ? "status error" : "";

    return (
        <div className="admin-shell">
            <header className="admin-topbar">
                <div className="brand-block">
                    <div className="app-badge">Admin</div>
                    <div>
                        <p className="eyebrow">Election Control</p>
                        <h1>Admin home</h1>
                        <p className="muted">Draft, publish, and monitor elections in one place.</p>
                    </div>
                </div>
                <div className="top-actions">
                    <Link className="ghost-btn" to="/admin/voters">Voter verification</Link>
                    <Link className="ghost-btn" to="/admin/candidates">Candidate verification</Link>
                    <Link className="primary-btn" to="/register">Invite admin</Link>
                    <button className="ghost-btn" onClick={handleLogout}>Log out</button>
                </div>
            </header>

            <section className="option-grid">
                <div className="option-card focus">
                    <div>
                        <p className="eyebrow">Priority</p>
                        <h3>Create election</h3>
                        <p className="muted">Add details and decide whether to save as draft or publish.</p>
                    </div>
                    <span className="pill success">Ready</span>
                </div>
                <div className="option-card muted-card">
                    <div>
                        <p className="eyebrow">Upcoming</p>
                        <h3>Voter verification</h3>
                        <p className="muted">Bulk KYC checks and document review.</p>
                    </div>
                    <span className="pill">Coming soon</span>
                </div>
                <div className="option-card muted-card">
                    <div>
                        <p className="eyebrow">Upcoming</p>
                        <h3>Candidate approvals</h3>
                        <p className="muted">Screen and approve candidates before ballots lock.</p>
                    </div>
                    <span className="pill">Coming soon</span>
                </div>
                <div className="option-card muted-card">
                    <div>
                        <p className="eyebrow">Upcoming</p>
                        <h3>Audit & logs</h3>
                        <p className="muted">Immutable audit trails and exportable reports.</p>
                    </div>
                    <span className="pill">Coming soon</span>
                </div>
            </section>

            <section className="panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Election setup</p>
                        <h2>Add election details</h2>
                    </div>
                    <span className="pill subtle">Draft or publish at the end</span>
                </div>

                {status.message && <div className={statusClass}>{status.message}</div>}

                <form className="admin-form" onSubmit={(e) => e.preventDefault()}>
                    <div className="form-grid">
                        <label>
                            Title
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                placeholder="General Election 2026"
                                required
                            />
                        </label>

                        <label>
                            Level
                            <select name="level" value={form.level} onChange={handleChange}>
                                <option value="DISTRICT">District</option>
                                <option value="STATE">State</option>
                                <option value="NATIONAL">National</option>
                            </select>
                        </label>

                        <label className="full">
                            Description
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                placeholder="What is this election about?"
                                rows={3}
                            />
                        </label>

                        <label>
                            Candidate registration closes
                            <input
                                type="datetime-local"
                                name="candidateRegistrationLastDate"
                                value={form.candidateRegistrationLastDate}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label>
                            Election start
                            <input
                                type="datetime-local"
                                name="electionStart"
                                value={form.electionStart}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label>
                            Election end
                            <input
                                type="datetime-local"
                                name="electionEnd"
                                value={form.electionEnd}
                                onChange={handleChange}
                                required
                            />
                        </label>
                    </div>

                    <div className="action-row">
                        <button
                            type="button"
                            className="ghost-btn"
                            onClick={() => submitElection("DRAFT")}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save as draft"}
                        </button>
                        <button
                            type="button"
                            className="submit-btn"
                            onClick={() => submitElection("UPCOMING")}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Publish"}
                        </button>
                    </div>
                </form>
            </section>

            <section className="panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Monitor</p>
                        <h2>Your elections</h2>
                    </div>
                    <span className="pill subtle">Auto-refresh on save</span>
                </div>

                {listLoading ? (
                    <p className="muted">Loading elections...</p>
                ) : elections.length === 0 ? (
                    <p className="muted">No elections yet. Draft one above to get started.</p>
                ) : (
                    <div className="election-list">
                        {elections.map((election) => {
                            const details = election.details || election;
                            const title = details.title || "Untitled Election";
                            const description = details.description || "No description provided.";
                            const level = details.level || "NATIONAL";
                            const status = details.status || "DRAFT";
                            const startDate = details.electionStart ? new Date(details.electionStart).toLocaleString() : "Invalid Date";

                            return (
                                <div key={election._id || election.electionId} className="election-row">
                                    <div>
                                        <h4>{title}</h4>
                                        <p className="muted">{description}</p>
                                        <p className="muted small">Level: {level}</p>
                                    </div>
                                    <div className="row-meta">
                                        <span className={`pill ${status === "DRAFT" ? "subtle" : status === "UPCOMING" ? "success" : ""}`}>
                                            {status}
                                        </span>
                                        <p className="muted small">Starts {startDate}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

export default AdminHome;
