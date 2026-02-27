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
    category: ""
};

function AdminHome() {
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem("token"), []);
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const [elections, setElections] = useState([]);
    const [selectedElection, setSelectedElection] = useState(null);
    const [status, setStatus] = useState({ type: "", message: "" });

    const getElectionId = (election) => {
        const details = election?.details || election || {};
        return election?._id || election?.electionId || details._id || details.electionId || "";
    };

    const getElectionStatus = (details = {}) => {
        const startTime = details.electionStart ? new Date(details.electionStart).getTime() : Number.NaN;
        const endTime = details.electionEnd ? new Date(details.electionEnd).getTime() : Number.NaN;
        const now = Date.now();

        if (!Number.isNaN(startTime) && !Number.isNaN(endTime)) {
            if (now < startTime) return "UPCOMING";
            if (now >= startTime && now < endTime) return "ONGOING";
            return "COMPLETED";
        }

        const current = (details.status || "UPCOMING").toUpperCase();
        if (current === "ENDED" || current === "CLOSED") return "COMPLETED";
        if (current === "UPCOMING" || current === "ONGOING" || current === "COMPLETED") return current;
        return "UPCOMING";
    };

    const electionSummary = useMemo(() => {
        return elections.reduce(
            (acc, election) => {
                const details = election.details || election;
                const current = getElectionStatus(details);
                acc.total += 1;
                if (current === "UPCOMING") acc.upcoming += 1;
                else if (current === "ONGOING") acc.ongoing += 1;
                else if (current === "COMPLETED") acc.completed += 1;
                return acc;
            },
            { total: 0, upcoming: 0, ongoing: 0, completed: 0 }
        );
    }, [elections]);

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
            setSelectedElection((prev) => {
                if (!electionsArray.length) return null;
                if (!prev) return null;

                const prevId = getElectionId(prev);
                const matched = electionsArray.find((item) => {
                    const itemId = getElectionId(item);
                    return String(itemId) === String(prevId);
                });

                return matched || null;
            });
        } catch (err) {
            setStatus({
                type: "error",
                message: err.response?.data?.message || "Could not load elections."
            });
            setElections([]);
            setSelectedElection(null);
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

    const submitElection = async () => {
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
            ...form
        };

        try {
            await axios.post(`${API_BASE}/elections`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setStatus({
                type: "success",
                message: "Election created successfully."
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

    const toggleElectionDetails = (election) => {
        setSelectedElection((prev) => {
            const prevId = getElectionId(prev);
            const currentId = getElectionId(election);
            if (String(prevId) === String(currentId)) return null;
            return election;
        });
    };

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
                    <button className="ghost-btn" onClick={handleLogout}>Log out</button>
                </div>
            </header>

            <section className="admin-metrics">
                <div className="metric-card">
                    <p className="eyebrow">Total</p>
                    <h3>{listLoading ? "--" : electionSummary.total}</h3>
                    <p className="muted small">All configured elections</p>
                </div>
                <div className="metric-card">
                    <p className="eyebrow">Upcoming</p>
                    <h3>{listLoading ? "--" : electionSummary.upcoming}</h3>
                    <p className="muted small">Awaiting start date</p>
                </div>
                <div className="metric-card">
                    <p className="eyebrow">Ongoing</p>
                    <h3>{listLoading ? "--" : electionSummary.ongoing}</h3>
                    <p className="muted small">Voting in progress</p>
                </div>
                <div className="metric-card">
                    <p className="eyebrow">Completed</p>
                    <h3>{listLoading ? "--" : electionSummary.completed}</h3>
                    <p className="muted small">Closed elections</p>
                </div>
            </section>

            <section className="panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Election setup</p>
                        <h2>Add election details</h2>
                    </div>
                    <span className="pill subtle">Create and publish election</span>
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

                        <label>
                            Category
                            <input
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                                placeholder="General, By-election, Special, etc."
                            />
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
                            className="submit-btn"
                            onClick={submitElection}
                            disabled={saving}
                        >
                            {saving ? "Creating..." : "Create Election"}
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
                    <p className="muted">No elections yet. Create one above to get started.</p>
                ) : (
                    <div className="election-list">
                        {elections.map((election) => {
                            const details = election.details || election;
                            const title = details.title || "Untitled Election";
                            const description = details.description || "No description provided.";
                            const level = details.level || "NATIONAL";
                            const category = details.category || "";
                            const electionStatus = getElectionStatus(details);
                            const startDate = details.electionStart ? new Date(details.electionStart).toLocaleString() : "Invalid Date";
                            const electionKey = election._id || election.electionId;
                            const selectedId = getElectionId(selectedElection);
                            const rowId = getElectionId(election);
                            const isSelected = String(rowId) === String(selectedId);
                            const detailsFields = [
                                ["Election ID", election.electionId || details.electionId || "-"],
                                ["Title", details.title || "-"],
                                ["Description", details.description || "-"],
                                ["Status", electionStatus],
                                ["Level", details.level || "-"],
                                ["Category", details.category || "-"],
                                ["Registration Last Date", details.candidateRegistrationLastDate ? new Date(details.candidateRegistrationLastDate).toLocaleString() : "-"],
                                ["Election Start", details.electionStart ? new Date(details.electionStart).toLocaleString() : "-"],
                                ["Election End", details.electionEnd ? new Date(details.electionEnd).toLocaleString() : "-"]
                            ];

                            return (
                                <div
                                    key={electionKey}
                                    className="election-row"
                                    style={{ cursor: "pointer", border: isSelected ? "1px solid var(--accent)" : undefined }}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleElectionDetails(election)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            toggleElectionDetails(election);
                                        }
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h4>{title}</h4>
                                        <p className="muted">{description}</p>
                                        <p className="muted small">Level: {level} {category && `| Category: ${category}`}</p>

                                        {isSelected && (
                                            <div style={{ marginTop: "0.6rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.4rem 0.8rem" }}>
                                                {detailsFields.map(([label, value]) => (
                                                    <div key={label}>
                                                        <p className="muted small" style={{ marginBottom: "0.1rem", fontSize: "11px" }}>{label}</p>
                                                        <p>{String(value)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="row-meta">
                                        <span className={`pill ${electionStatus === "UPCOMING" ? "subtle" : electionStatus === "ONGOING" ? "success" : ""}`}>
                                            {electionStatus}
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
