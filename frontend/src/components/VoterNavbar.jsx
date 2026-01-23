import React from "react";
import "./VoterNavbar.css";

const VoterNavbar = ({ activeTab, onTabChange, badge, onLogout }) => {
    const tabs = [
        { id: "profile", label: "Profile", icon: "👤" },
        { id: "elections", label: "Elections", icon: "🗳️" },
        { id: "results", label: "Results", icon: "📊" },
        { id: "past-votes", label: "Past Votes", icon: "📜" }
    ];

    return (
        <nav className="voter-navbar">
            <div className="voter-navbar-content">
                <div className="voter-navbar-left">
                    <div className="voter-brand-logo">
                        <h2>🗳️ Voter Portal</h2>
                    </div>
                    <div className="voter-tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`voter-tab ${activeTab === tab.id ? "active" : ""}`}
                                onClick={() => onTabChange(tab.id)}
                            >
                                <span className="tab-icon">{tab.icon}</span>
                                <span className="tab-label">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="voter-navbar-right">
                    {badge && (
                        <div className={`status-badge ${badge.tone}`}>
                            {badge.label}
                        </div>
                    )}
                    <button className="logout-btn" onClick={onLogout}>
                        Log out
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default VoterNavbar;
