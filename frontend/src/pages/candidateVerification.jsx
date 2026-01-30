import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";
const API_HOST = API_BASE.replace(/\/$/, "").replace(/\/api$/, "");

const statusTone = (status) => {
    if (status === "VERIFIED") return "success";
    if (status === "REJECTED") return "error";
    return "warning";
};

function CandidateVerification() {
    const token = useMemo(() => localStorage.getItem("token"), []);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [remarkInputs, setRemarkInputs] = useState({});
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const fetchCandidates = async () => {
        setLoading(true);
        setMessage({ type: "", text: "" });
        try {
            const { data } = await axios.get(`${API_BASE}/candidates`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // sort pending first
            const ordered = [...data].sort((a, b) => {
                const order = { PENDING: 0, REJECTED: 1, VERIFIED: 2 };
                return (order[a.status] ?? 3) - (order[b.status] ?? 3);
            });
            setCandidates(ordered);
        } catch (err) {
            const msg = err.response?.data?.message || "Could not load candidates";
            setMessage({ type: "error", text: msg });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCandidates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateCandidate = async (candidateId, status) => {
        try {
            const remarks = remarkInputs[candidateId] || "";
            if (status === "REJECTED" && !remarks.trim()) {
                setMessage({ type: "error", text: "Remarks are required to reject a candidate profile." });
                return;
            }
            await axios.put(
                `${API_BASE}/candidates/${candidateId}/approve`,
                { status, remarks },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage({ type: "success", text: `Candidate ${status.toLowerCase()} successfully.` });
            setRemarkInputs({ ...remarkInputs, [candidateId]: "" }); // Clear remark after action
            fetchCandidates();
        } catch (err) {
            const msg = err.response?.data?.message || "Action failed";
            setMessage({ type: "error", text: msg });
        }
    };

    const renderDocLink = (candidate) => {
        if (!candidate.documentFile) return <span className="muted small">No document</span>;

        const fileName = candidate.documentFile.split(/[/\\]/).pop();
        let href;

        // Check if it's an absolute path (legacy documents)
        if (candidate.documentFile.match(/^[A-Za-z]:\//)) {
            href = `${API_HOST}/documents/${fileName}`;
        } else {
            // Relative path in uploads folder
            const normalizedUrl = candidate.documentUrl || `/uploads/${candidate.documentType || 'docs'}/${fileName}`;
            href = `${API_HOST}${normalizedUrl}`;
        }

        return (
            <a className="primary-link" href={href} target="_blank" rel="noreferrer">
                View document
            </a>
        );
    };

    const filtered = candidates.filter((c) => {
        const user = c.userId || {};
        const hay = `${user.fullName || ""} ${user.email || ""} ${c.candidateId || ""} ${c.partyName || ""}`.toLowerCase();
        const matchSearch = hay.includes(search.toLowerCase());
        const matchStatus = statusFilter === "ALL" ? c.status === "PENDING" : c.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const counts = candidates.reduce(
        (acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1;
            return acc;
        },
        { PENDING: 0, VERIFIED: 0, REJECTED: 0 }
    );

    return (
        <div className="admin-shell">
            <header className="admin-topbar">
                <div className="brand-block">
                    <div className="app-badge">Admin</div>
                    <div>
                        <p className="eyebrow">Election control</p>
                        <h1>Candidate verification</h1>
                        <p className="muted">Review documents and approve or reject candidate profiles.</p>
                    </div>
                </div>
                <div className="top-actions">
                    <Link className="ghost-btn" to="/admin">Back to admin home</Link>
                </div>
            </header>

            <section className="panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Verification</p>
                        <h2>All candidates</h2>
                    </div>
                    <span className="pill subtle">Pending → review and approve</span>
                </div>

                <div className="filter-row">
                    <input
                        className="remarks-input"
                        placeholder="Search by name, email, candidate ID, party"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="filter-chips">
                        {[
                            { key: "ALL", label: `Pending (${counts.PENDING || 0})` },
                            { key: "VERIFIED", label: `Verified (${counts.VERIFIED || 0})` },
                            { key: "REJECTED", label: `Rejected (${counts.REJECTED || 0})` },
                        ].map((chip) => (
                            <button
                                key={chip.key}
                                className={`chip ${statusFilter === chip.key ? "active" : ""}`}
                                onClick={() => setStatusFilter(chip.key)}
                                type="button"
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>
                </div>

                {message.text && (
                    <div className={`status ${message.type === "error" ? "error" : "success"}`}>
                        {message.text}
                    </div>
                )}

                {loading ? (
                    <p className="muted">Loading candidates...</p>
                ) : filtered.length === 0 ? (
                    <p className="muted">No candidates found.</p>
                ) : (
                    <div className="election-list">
                        {filtered.map((candidate) => {
                            const user = candidate.userId || {};
                            const tone = statusTone(candidate.status);
                            return (
                                <div key={candidate._id} className="election-row">
                                    <div>
                                        <h4>{user.fullName || "Unnamed candidate"}</h4>
                                        <p className="muted small">Email: {user.email || "-"}</p>
                                        <p className="muted small">Phone: {user.phoneNumber || "-"}</p>
                                        <p className="muted small">Candidate ID: {candidate.candidateId}</p>
                                        <p className="muted small">Party: {candidate.partyName || "-"}</p>
                                        <p className="muted small">Qualification: {candidate.qualification || "-"}</p>
                                        <p className="muted small">Experience: {candidate.experience || "-"}</p>
                                        <p className="muted small">Address: {candidate.address}, {candidate.district}, {candidate.state}, {candidate.pincode}</p>
                                        <p className="muted small">DOB: {candidate.dateOfBirth ? new Date(candidate.dateOfBirth).toLocaleDateString() : "-"}</p>
                                        <p className="muted small">Document: {renderDocLink(candidate)}</p>
                                        {candidate.walletAddress && <p className="muted small">Wallet: {candidate.walletAddress}</p>}
                                        {candidate.documentType && <p className="muted small">Document type: {candidate.documentType}</p>}
                                        <p className="muted small">Submitted: {candidate.createdAt ? new Date(candidate.createdAt).toLocaleString() : "-"}</p>
                                    </div>
                                    <div className="row-meta" style={{ gap: "10px" }}>
                                        <span className={`pill ${tone}`}>{candidate.status}</span>
                                        {candidate.remarks && <p className="muted small">Remarks: {candidate.remarks}</p>}
                                        <input
                                            className="remarks-input"
                                            placeholder={candidate.status === "VERIFIED" ? "Remarks (required for rejection)" : "Remarks (optional)"}
                                            value={remarkInputs[candidate._id] || ""}
                                            onChange={(e) => setRemarkInputs({ ...remarkInputs, [candidate._id]: e.target.value })}
                                        />
                                        <div className="action-row">
                                            <button
                                                className="ghost-btn"
                                                onClick={() => updateCandidate(candidate._id, "REJECTED")}
                                                disabled={candidate.status === "REJECTED"}
                                            >
                                                Reject
                                            </button>
                                            {candidate.status !== "VERIFIED" && (
                                                <button
                                                    className="primary-btn"
                                                    onClick={() => updateCandidate(candidate._id, "VERIFIED")}
                                                >
                                                    Approve
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
                }
            </section>
        </div>
    );
}

export default CandidateVerification;
