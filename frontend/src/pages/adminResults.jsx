import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

function AdminResults() {
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem("token"), []);
    const [results, setResults] = useState([]);
    const [resultsLoading, setResultsLoading] = useState(true);
    const [selectedResultElection, setSelectedResultElection] = useState(null);

    const handleLogout = () => {
        try {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
        } finally {
            navigate("/login", { replace: true });
        }
    };

    const fetchResults = async () => {
        setResultsLoading(true);
        try {
            const { data } = await axios.get(`${API_BASE}/votes/results/completed`);
            const completedElections = Array.isArray(data) ? data : [];
            setResults(completedElections);
        } catch (err) {
            console.error('Error fetching results:', err);
            setResults([]);
        } finally {
            setResultsLoading(false);
        }
    };

    useEffect(() => {
        fetchResults();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderDetailedResults = () => {
        if (!selectedResultElection) return null;

        const totalVotes = selectedResultElection.candidates.reduce((sum, c) => sum + c.voteCount, 0);
        const sortedCandidates = [...selectedResultElection.candidates].sort((a, b) => b.voteCount - a.voteCount);

        return (
            <section className="panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Election Results</p>
                        <h2>{selectedResultElection.electionTitle}</h2>
                    </div>
                    <button className="ghost-btn" onClick={() => setSelectedResultElection(null)}>Back to Results</button>
                </div>

                {selectedResultElection.candidates.length === 0 ? (
                    <div className="notice info">No candidates registered for this election.</div>
                ) : (
                    <div className="results-detail">
                        <div className="results-header">
                            <h3>Vote Distribution</h3>
                            <div className="results-metrics">
                                <span>Total Candidates: {selectedResultElection.candidates.length}</span>
                                <span>Total Votes: {totalVotes}</span>
                            </div>
                        </div>
                        <div className="results-list">
                            {sortedCandidates.map((candidate, index) => {
                                const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(2) : 0;
                                const isWinner = index === 0 && candidate.voteCount > 0;

                                return (
                                    <div
                                        key={candidate.candidateId}
                                        className={`results-item${isWinner ? " is-winner" : ""}`}
                                    >
                                        <div className="results-row">
                                            <div className="results-meta">
                                                <span className="results-rank">#{index + 1}</span>
                                                <div>
                                                    <h4 className="results-name">
                                                        {isWinner && "🏆 "}
                                                        {candidate.name}
                                                    </h4>
                                                    <p className="muted small">{percentage}% of total votes</p>
                                                </div>
                                            </div>
                                            <div className="results-score">
                                                <span>{candidate.voteCount}</span>
                                            </div>
                                        </div>
                                        {totalVotes > 0 && (
                                            <div className="results-bar">
                                                <div
                                                    className="results-bar-fill"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {totalVotes === 0 && (
                            <div className="notice warning" style={{ marginTop: "20px" }}>
                                No votes have been cast yet in this election.
                            </div>
                        )}
                    </div>
                )}
            </section>
        );
    };

    const renderResultsList = () => {
        return (
            <section className="panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Election outcomes</p>
                        <h2>Results</h2>
                    </div>
                    <button className="ghost-btn" onClick={fetchResults} disabled={resultsLoading}>
                        {resultsLoading ? "Loading..." : "Refresh"}
                    </button>
                </div>

                {resultsLoading ? (
                    <p className="muted">Loading results...</p>
                ) : results.length === 0 ? (
                    <div className="notice info">No completed elections with results available yet.</div>
                ) : (
                    <div className="election-grid">
                        {results.map((election) => {
                            const totalVotes = election.candidates.reduce((sum, c) => sum + c.voteCount, 0);
                            const winner = election.candidates.length > 0
                                ? election.candidates.reduce((max, c) => c.voteCount > max.voteCount ? c : max)
                                : null;

                            return (
                                <div key={election.electionId} className="election-card">
                                    <div>
                                        <h4>{election.electionTitle}</h4>
                                        <p className="muted small"></p>
                                        <p className="muted small">Total Candidates: {election.candidates.length}</p>
                                        <p className="muted small">Total Votes: {totalVotes}</p>
                                        {winner && winner.voteCount > 0 && (
                                            <div style={{
                                                marginTop: "10px",
                                                padding: "8px 12px",
                                                backgroundColor: "#f0f8ff",
                                                borderRadius: "4px",
                                                borderLeft: "3px solid #28a745"
                                            }}>
                                                <p className="muted small" style={{ margin: 0 }}>
                                                    🏆 <strong>Leading:</strong> {winner.name}
                                                </p>
                                                <p className="muted small" style={{ margin: "2px 0 0 0" }}>
                                                    {winner.voteCount} votes
                                                </p>
                                            </div>
                                        )}
                                        {election.candidates.length === 0 && (
                                            <div className="notice warning" style={{ marginTop: "10px", padding: "8px", fontSize: "12px" }}>
                                                No candidates registered
                                            </div>
                                        )}
                                    </div>
                                    <div className="card-actions">
                                        <button
                                            className="primary-btn"
                                            onClick={() => setSelectedResultElection(election)}
                                            disabled={election.candidates.length === 0}
                                        >
                                            View Results
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        );
    };

    return (
        <div className="admin-shell">
            <header className="admin-topbar">
                <div className="brand-block">
                    <div className="app-badge">Admin</div>
                    <div>
                        <p className="eyebrow">Election Results</p>
                        <h1>View results</h1>
                        <p className="muted">Monitor completed elections and voting outcomes.</p>
                    </div>
                </div>
                <div className="top-actions">
                    <button className="ghost-btn" onClick={() => navigate("/admin")}>Back to Home</button>
                    <button className="ghost-btn" onClick={handleLogout}>Log out</button>
                </div>
            </header>

            {selectedResultElection ? renderDetailedResults() : renderResultsList()}
        </div>
    );
}

export default AdminResults;
