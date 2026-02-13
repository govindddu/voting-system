import React from "react";
import "./VoterNavbar.css";

const VoterNavbar = ({ activeTab, onTabChange, badge, onLogout }) => {
    const tabs = [
        { id: "profile", label: "Profile", icon: "👤", iconClass: "icon-profile" },
        { id: "elections", label: "Elections", icon: "🗳️", iconClass: "icon-elections" },
        { id: "my-registrations", label: "My Registrations", icon: "📝", iconClass: "icon-registrations" },
        { id: "results", label: "Results", icon: "📊", iconClass: "icon-results" },
        { id: "past-votes", label: "Past Votes", icon: "📜", iconClass: "icon-history" }
    ];

    return (
        <nav className="voter-navbar">
            <div className="navbar-glass-layer"></div>
            <div className="voter-navbar-content">
                <div className="voter-navbar-left">
                    <div className="voter-brand-logo">
                        <div className="brand-icon-wrap">
                            <span className="brand-icon">🗳️</span>
                            <div className="brand-icon-glow"></div>
                        </div>
                        <div className="brand-text">
                            <span className="brand-title">Voter Portal</span>
                            <span className="brand-subtitle">Secure Blockchain Voting</span>
                        </div>
                    </div>
                    <div className="navbar-divider"></div>
                    <div className="voter-tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`voter-tab ${activeTab === tab.id ? "active" : ""}`}
                                onClick={() => onTabChange(tab.id)}
                            >
                                <span className={`tab-icon ${tab.iconClass}`}>{tab.icon}</span>
                                <span className="tab-label">{tab.label}</span>
                                {activeTab === tab.id && <span className="tab-indicator"></span>}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="voter-navbar-right">
                    {badge && (
                        <div className={`status-badge ${badge.tone}`}>
                            <span className="badge-dot"></span>
                            <span className="badge-text">{badge.label}</span>
                        </div>
                    )}
                    <button className="logout-btn" onClick={onLogout}>
                        <svg className="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Log out</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default VoterNavbar;
