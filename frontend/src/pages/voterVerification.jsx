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

function VoterVerification() {
    const token = useMemo(() => localStorage.getItem("token"), []);
    const [voters, setVoters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [remarkInputs, setRemarkInputs] = useState({});
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const fetchVoters = async () => {
        setLoading(true);
        setMessage({ type: "", text: "" });
        try {
            const { data } = await axios.get(`${API_BASE}/voters`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // sort pending first
            const ordered = [...data].sort((a, b) => {
                const order = { PENDING: 0, REJECTED: 1, VERIFIED: 2 };
                return (order[a.status] ?? 3) - (order[b.status] ?? 3);
            });
            setVoters(ordered);
        } catch (err) {
            const msg = err.response?.data?.message || "Could not load voters";
            setMessage({ type: "error", text: msg });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVoters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateVoter = async (voterId, status) => {
        try {
            const remarks = remarkInputs[voterId] || "";
            if (status === "REJECTED" && !remarks.trim()) {
                setMessage({ type: "error", text: "Remarks are required to reject a voter profile." });
                return;
            }
            await axios.put(
                `${API_BASE}/voters/${voterId}/verify`,
                { status, remarks },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage({ type: "success", text: `Voter ${status.toLowerCase()} successfully.` });
            setRemarkInputs({ ...remarkInputs, [voterId]: "" }); // Clear remark after action
            fetchVoters();
        } catch (err) {
            const msg = err.response?.data?.message || "Action failed";
            setMessage({ type: "error", text: msg });
        }
    };

    const renderDocLink = (voter) => {
        if (!voter.documentFile) return <span className="muted small">No document</span>;

        const fileName = voter.documentFile.split(/[/\\]/).pop();
        let href;

        // Check if it's an absolute path (legacy documents)
        if (voter.documentFile.match(/^[A-Za-z]:\//)) {
            href = `${API_HOST}/documents/${fileName}`;
        } else {
            // Relative path in uploads folder
            const normalizedUrl = voter.documentUrl || `/uploads/${voter.documentType || 'docs'}/${fileName}`;
            href = `${API_HOST}${normalizedUrl}`;
        }

        return (
            <a className="primary-link" href={href} target="_blank" rel="noreferrer">
                View document
            </a>
        );
    };

    const filtered = voters.filter((v) => {
        const user = v.userId || {};
        const hay = `${user.fullName || ""} ${user.email || ""} ${v.voterId || ""}`.toLowerCase();
        const matchSearch = hay.includes(search.toLowerCase());
        const matchStatus = statusFilter === "ALL" ? v.status === "PENDING" : v.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const counts = voters.reduce(
        (acc, v) => {
            acc[v.status] = (acc[v.status] || 0) + 1;
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
                        <h1>Voter verification</h1>
                        <p className="muted">Review documents and approve or reject voter profiles.</p>
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
                        <h2>All voters</h2>
                    </div>
                    <span className="pill subtle">Pending → review and approve</span>
                </div>

                <div className="filter-row">
                    <input
                        className="remarks-input"
                        placeholder="Search by name, email, voter ID"
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
                    <p className="muted">Loading voters...</p>
                ) : filtered.length === 0 ? (
                    <p className="muted">No voters found.</p>
                ) : (
                    <div className="election-list">
                        {filtered.map((voter) => {
                            const user = voter.userId || {};
                            const tone = statusTone(voter.status);
                            return (
                                <div key={voter._id} className="election-row">
                                    <div>
                                        <h4>{user.fullName || "Unnamed user"}</h4>
                                        <p className="muted small">Email: {user.email || "-"}</p>
                                        <p className="muted small">Phone: {user.phoneNumber || "-"}</p>
                                        <p className="muted small">Voter ID: {voter.voterId}</p>
                                        <p className="muted small">Address: {voter.address}, {voter.district}, {voter.state}, {voter.pincode}</p>
                                        <p className="muted small">DOB: {voter.dateOfBirth ? new Date(voter.dateOfBirth).toLocaleDateString() : "-"}</p>
                                        <p className="muted small">Document: {renderDocLink(voter)}</p>
                                        {voter.walletAddress && <p className="muted small">Wallet: {voter.walletAddress}</p>}
                                        {voter.documentType && <p className="muted small">Document type: {voter.documentType}</p>}
                                        <p className="muted small">Submitted: {voter.createdAt ? new Date(voter.createdAt).toLocaleString() : "-"}</p>
                                    </div>
                                    <div className="row-meta" style={{ gap: "10px" }}>
                                        <span className={`pill ${tone}`}>{voter.status}</span>
                                        {voter.remarks && <p className="muted small">Remarks: {voter.remarks}</p>}
                                        <input
                                            className="remarks-input"
                                            placeholder={voter.status === "VERIFIED" ? "Remarks (required for rejection)" : "Remarks (optional)"}
                                            value={remarkInputs[voter._id] || ""}
                                            onChange={(e) => setRemarkInputs({ ...remarkInputs, [voter._id]: e.target.value })}
                                        />
                                        <div className="action-row">
                                            <button
                                                className="ghost-btn"
                                                onClick={() => updateVoter(voter._id, "REJECTED")}
                                                disabled={voter.status === "REJECTED"}
                                            >
                                                Reject
                                            </button>
                                            {voter.status !== "VERIFIED" && (
                                                <button
                                                    className="primary-btn"
                                                    onClick={() => updateVoter(voter._id, "VERIFIED")}
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

export default VoterVerification;
