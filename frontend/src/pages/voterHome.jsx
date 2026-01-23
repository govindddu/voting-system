import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import VoterNavbar from "../components/VoterNavbar";


const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";


const defaultProfileForm = {
    voterId: "",
    dateOfBirth: "",
    gender: "Male",
    address: "",
    state: "",
    district: "",
    pincode: "",
    documentType: "AADHAR"
};


const defaultCandidateForm = {
    partyName: "",
    manifesto: "",
    documentType: "AADHAR"
};


const statusBadge = (status) => {
    if (status === "VERIFIED") return { label: "Approved", tone: "success" };
    if (status === "REJECTED") return { label: "Rejected", tone: "error" };
    if (status === "PENDING") return { label: "Pending review", tone: "warning" };
    return { label: "Profile missing", tone: "error" };
};


function VoterHome() {
    const token = useMemo(() => localStorage.getItem("token"), []);
    const navigate = useNavigate();


    const [activeTab, setActiveTab] = useState("profile");
    const [profile, setProfile] = useState(null);
    const [profileStatus, setProfileStatus] = useState("MISSING");
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });
    const [profileForm, setProfileForm] = useState(defaultProfileForm);
    const [documentFile, setDocumentFile] = useState(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);


    const [elections, setElections] = useState([]);
    const [electionsLoading, setElectionsLoading] = useState(true);
    const [candidateSelection, setCandidateSelection] = useState(null);
    const [candidateForm, setCandidateForm] = useState(defaultCandidateForm);
    const [candidateDoc, setCandidateDoc] = useState(null);
    const [candidateSymbol, setCandidateSymbol] = useState(null);
    const [candidateMessage, setCandidateMessage] = useState({ type: "", text: "" });


    const [results, setResults] = useState([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [pastVotes, setPastVotes] = useState([]);
    const [pastVotesLoading, setPastVotesLoading] = useState(false);


    const isVerified = profileStatus === "VERIFIED";
    const needsAttention = profileStatus !== "VERIFIED";


    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
    };


    useEffect(() => {
        fetchProfile();
        fetchElections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    useEffect(() => {
        if (activeTab === "results") {
            fetchResults();
        } else if (activeTab === "past-votes") {
            fetchPastVotes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);


    const fetchProfile = async () => {
        if (!token) {
            setProfileLoading(false);
            setProfileStatus("MISSING");
            return;
        }
        setProfileLoading(true);
        try {
            const { data } = await axios.get(`${API_BASE}/voters/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(data);
            setProfileStatus(data.status || "PENDING");
            setProfileForm({
                voterId: data.voterId || "",
                dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : "",
                gender: data.gender || "Male",
                address: data.address || "",
                state: data.state || "",
                district: data.district || "",
                pincode: data.pincode || "",
                documentType: data.documentType || "AADHAR"
            });
        } catch (err) {
            if (err.response?.status === 404) {
                setProfileStatus("MISSING");
            } else {
                setProfileMessage({ type: "error", text: err.response?.data?.message || "Could not load profile." });
            }
        } finally {
            setProfileLoading(false);
        }
    };


    const fetchElections = async () => {
        if (!token) {
            setElectionsLoading(false);
            return;
        }
        setElectionsLoading(true);
        try {
            const { data } = await axios.get(`${API_BASE}/elections`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const raw = Array.isArray(data) ? data : data.elections || data.data || [];
            const now = new Date();
            const mapped = raw
                .map((item) => {
                    const details = item.details || item;
                    const startDate = details?.electionStart ? new Date(details.electionStart) : null;
                    const endDate = details?.electionEnd ? new Date(details.electionEnd) : null;
                    const regClose = details?.candidateRegistrationLastDate ? new Date(details.candidateRegistrationLastDate) : null;
                   
                    // Determine election status based on dates
                    let computedStatus = details?.status || item.status || "DRAFT";
                    if (startDate && endDate) {
                        if (now < startDate) {
                            computedStatus = "UPCOMING";
                        } else if (now >= startDate && now <= endDate) {
                            computedStatus = "ACTIVE";
                        } else if (now > endDate) {
                            computedStatus = "COMPLETED";
                        }
                    }
                   
                    return {
                        id: details?._id || item._id || item.electionId || item.id,
                        title: details?.title || "Untitled Election",
                        description: details?.description || "No description provided.",
                        level: details?.level || "NATIONAL",
                        status: computedStatus,
                        startDate,
                        endDate,
                        regClose,
                        raw: item,
                        dbDetails: details
                    };
                })
                .sort((a, b) => {
                    // Sort: Active > Upcoming > Completed
                    const statusOrder = { "ACTIVE": 1, "UPCOMING": 2, "COMPLETED": 3, "DRAFT": 4 };
                    return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
                });
            setElections(mapped);
        } catch (err) {
            setElections([]);
        } finally {
            setElectionsLoading(false);
        }
    };


    const fetchResults = async () => {
        setResultsLoading(true);
        try {
            const { data } = await axios.get(`${API_BASE}/elections`);
            const raw = Array.isArray(data) ? data : data.elections || data.data || [];
            const completed = raw
                .filter((e) => (e.details?.status || e.status) === "COMPLETED")
                .map((item) => {
                    const details = item.details || item;
                    return {
                        id: details?._id || item._id || item.electionId || item.id,
                        title: details?.title || "Untitled Election",
                        level: details?.level || "NATIONAL",
                        status: details?.status || "COMPLETED",
                        raw: item
                    };
                });
            setResults(completed);
        } catch (err) {
            setResults([]);
        } finally {
            setResultsLoading(false);
        }
    };


    const fetchPastVotes = async () => {
        if (!token) {
            setPastVotesLoading(false);
            return;
        }
        setPastVotesLoading(true);
        try {
            const { data } = await axios.get(`${API_BASE}/votes/my-votes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const votes = Array.isArray(data) ? data : data.votes || [];
            setPastVotes(votes);
        } catch (err) {
            setPastVotes([]);
        } finally {
            setPastVotesLoading(false);
        }
    };


    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileForm((prev) => ({ ...prev, [name]: value }));
    };


    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        if (!token) {
            setProfileMessage({ type: "error", text: "Please sign in to submit your profile." });
            return;
        }
        if (!documentFile) {
            setProfileMessage({ type: "error", text: "Document file is required." });
            return;
        }


        const formData = new FormData();
        Object.entries(profileForm).forEach(([key, value]) => {
            if (key === "voterId" && !value) return; // let backend auto-generate
            formData.append(key, value);
        });
        formData.append("documentFile", documentFile);


        setProfileMessage({ type: "", text: "" });
        try {
            const { data } = await axios.post(`${API_BASE}/voters/create`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });
            setProfile(data.voter || data);
            setProfileStatus(data.voter?.status || data.status || "PENDING");
            setProfileMessage({ type: "success", text: data.message || "Profile submitted for approval." });
            setDocumentFile(null);
        } catch (err) {
            const serverMsg = err.response?.data?.message || err.response?.data?.error;
            setProfileMessage({ type: "error", text: serverMsg || "Could not submit profile." });
        }
    };


    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (!token) {
            setProfileMessage({ type: "error", text: "Please sign in to update your profile." });
            return;
        }


        const formData = new FormData();
        Object.entries(profileForm).forEach(([key, value]) => {
            if (key !== "voterId" && value) {
                formData.append(key, value);
            }
        });
        if (documentFile) {
            formData.append("documentFile", documentFile);
        }


        setProfileMessage({ type: "", text: "" });
        try {
            const { data } = await axios.put(`${API_BASE}/voters/update`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });
            setProfile(data.voter || data);
            setProfileStatus(data.voter?.status || data.status || "PENDING");
            setProfileMessage({ type: "success", text: data.message || "Profile updated successfully." });
            setDocumentFile(null);
            setIsEditingProfile(false);
            fetchProfile();
        } catch (err) {
            const serverMsg = err.response?.data?.message || err.response?.data?.error;
            setProfileMessage({ type: "error", text: serverMsg || "Could not update profile." });
        }
    };


    const handleEditProfile = () => {
        setIsEditingProfile(true);
        setProfileMessage({ type: "", text: "" });
    };


    const handleCancelEdit = () => {
        setIsEditingProfile(false);
        setDocumentFile(null);
        setProfileMessage({ type: "", text: "" });
        // Reset form to current profile data
        if (profile) {
            setProfileForm({
                voterId: profile.voterId || "",
                dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : "",
                gender: profile.gender || "Male",
                address: profile.address || "",
                state: profile.state || "",
                district: profile.district || "",
                pincode: profile.pincode || "",
                documentType: profile.documentType || "AADHAR"
            });
        }
    };


    const openCandidateForm = (election) => {
        setCandidateSelection(election);
        setCandidateForm(defaultCandidateForm);
        setCandidateDoc(null);
        setCandidateSymbol(null);
        setCandidateMessage({ type: "", text: "" });
    };


    const handleCandidateSubmit = async (e) => {
        e.preventDefault();
        if (!token) {
            setCandidateMessage({ type: "error", text: "Please sign in to apply." });
            return;
        }
        if (!isVerified) {
            setCandidateMessage({ type: "error", text: "Get admin approval before applying as a candidate." });
            return;
        }
        if (!candidateSelection) return;


        const now = new Date();
        if (candidateSelection.regClose && now > candidateSelection.regClose) {
            setCandidateMessage({ type: "error", text: "Registration has closed for this election." });
            return;
        }
        if (!candidateDoc) {
            setCandidateMessage({ type: "error", text: "Supporting document is required." });
            return;
        }


        const formData = new FormData();
        formData.append("electionId", candidateSelection.dbDetails?._id || candidateSelection.id);
        formData.append("partyName", candidateForm.partyName);
        formData.append("manifesto", candidateForm.manifesto);
        formData.append("documentType", candidateForm.documentType);
        formData.append("documentFile", candidateDoc);
        if (candidateSymbol) {
            formData.append("symbol", candidateSymbol);
        }


        setCandidateMessage({ type: "", text: "" });
        try {
            const { data } = await axios.post(`${API_BASE}/candidates/register`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });
            setCandidateMessage({ type: "success", text: data.message || "Candidate request sent for approval." });
            setCandidateForm(defaultCandidateForm);
            setCandidateDoc(null);
            setCandidateSymbol(null);
        } catch (err) {
            setCandidateMessage({ type: "error", text: err.response?.data?.message || "Could not submit candidate request." });
        }
    };


    const badge = statusBadge(profileStatus);


    const redDotClass = needsAttention ? "status-dot danger" : "status-dot success";


    const renderProfileTab = () => (
        <>
            <section className="panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Your profile</p>
                        <h2>Status: {badge.label}</h2>
                    </div>
                    {needsAttention && <span className="pill subtle">Action needed</span>}
                </div>


                {profileMessage.text && (
                    <div className={`status ${profileMessage.type === "error" ? "error" : "success"}`}>
                        {profileMessage.text}
                    </div>
                )}


                {profileStatus === "REJECTED" && profile?.remarks && (
                    <div className="notice error">Rejected: {profile.remarks}</div>
                )}
                {profileStatus === "PENDING" && (
                    <div className="notice warning">Your profile is under review. You can still edit and resubmit if needed.</div>
                )}


                {profileLoading ? (
                    <p className="muted">Loading profile...</p>
                ) : profile && profileStatus !== "MISSING" && !isEditingProfile ? (
                    <>
                        <div className="profile-summary">
                            <div>
                                <p className="muted small">Voter ID</p>
                                <strong>{profile.voterId}</strong>
                            </div>
                            <div>
                                <p className="muted small">Date of Birth</p>
                                <strong>{profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "N/A"}</strong>
                            </div>
                            <div>
                                <p className="muted small">Gender</p>
                                <strong>{profile.gender}</strong>
                            </div>
                            <div>
                                <p className="muted small">Address</p>
                                <strong>{profile.address}</strong>
                            </div>
                            <div>
                                <p className="muted small">State / District</p>
                                <strong>{profile.state} / {profile.district}</strong>
                            </div>
                            <div>
                                <p className="muted small">Pincode</p>
                                <strong>{profile.pincode}</strong>
                            </div>
                            <div>
                                <p className="muted small">Status</p>
                                <strong>{badge.label}</strong>
                            </div>
                        </div>
                        <div className="action-row" style={{ marginTop: "20px" }}>
                            <button type="button" className="primary-btn" onClick={handleEditProfile}>
                                Edit Profile
                            </button>
                        </div>
                    </>
                ) : isEditingProfile ? (
                    <form className="admin-form" onSubmit={handleProfileUpdate}>
                        <div className="form-grid">
                            <label>
                                Voter ID (cannot change)
                                <input
                                    name="voterId"
                                    value={profileForm.voterId}
                                    disabled
                                    style={{ backgroundColor: "#f0f0f0", cursor: "not-allowed" }}
                                />
                            </label>
                            <label>
                                Date of Birth
                                <input type="date" name="dateOfBirth" value={profileForm.dateOfBirth} onChange={handleProfileChange} required />
                            </label>
                            <label>
                                Gender
                                <select name="gender" value={profileForm.gender} onChange={handleProfileChange}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </label>
                            <label>
                                Address
                                <input name="address" value={profileForm.address} onChange={handleProfileChange} required />
                            </label>
                            <label>
                                State
                                <input name="state" value={profileForm.state} onChange={handleProfileChange} required />
                            </label>
                            <label>
                                District
                                <input name="district" value={profileForm.district} onChange={handleProfileChange} required />
                            </label>
                            <label>
                                Pincode
                                <input name="pincode" value={profileForm.pincode} onChange={handleProfileChange} required />
                            </label>
                            <label>
                                Document type
                                <select name="documentType" value={profileForm.documentType} onChange={handleProfileChange}>
                                    <option value="AADHAR">Aadhar</option>
                                    <option value="PAN">PAN</option>
                                    <option value="VOTER">Voter ID</option>
                                </select>
                            </label>
                            <label className="full">
                                Upload new document (optional)
                                <input type="file" accept="image/*,application/pdf" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} />
                                <p className="muted small" style={{ marginTop: "4px" }}>Leave empty to keep existing document</p>
                            </label>
                        </div>
                        <div className="action-row">
                            <button type="button" className="ghost-btn" onClick={handleCancelEdit}>Cancel</button>
                            <button type="submit" className="submit-btn">Update Profile</button>
                        </div>
                    </form>
                ) : (
                    <form className="admin-form" onSubmit={handleProfileSubmit}>
                        <div className="form-grid">
                            <label>
                                Voter ID (auto)
                                <input
                                    name="voterId"
                                    value={profileForm.voterId}
                                    onChange={handleProfileChange}
                                    placeholder="Auto-generated after submit"
                                />
                            </label>
                            <label>
                                Date of Birth
                                <input type="date" name="dateOfBirth" value={profileForm.dateOfBirth} onChange={handleProfileChange} required />
                            </label>
                            <label>
                                Gender
                                <select name="gender" value={profileForm.gender} onChange={handleProfileChange}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </label>
                            <label>
                                Address
                                <input name="address" value={profileForm.address} onChange={handleProfileChange} required />
                            </label>
                            <label>
                                State
                                <input name="state" value={profileForm.state} onChange={handleProfileChange} required />
                            </label>
                            <label>
                                District
                                <input name="district" value={profileForm.district} onChange={handleProfileChange} required />
                            </label>
                            <label>
                                Pincode
                                <input name="pincode" value={profileForm.pincode} onChange={handleProfileChange} required />
                            </label>
                            <label>
                                Document type
                                <select name="documentType" value={profileForm.documentType} onChange={handleProfileChange}>
                                    <option value="AADHAR">Aadhar</option>
                                    <option value="PAN">PAN</option>
                                    <option value="VOTER">Voter ID</option>
                                </select>
                            </label>
                            <label className="full">
                                Upload document
                                <input type="file" accept="image/*,application/pdf" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} required />
                            </label>
                        </div>
                        <div className="action-row">
                            <button type="submit" className="submit-btn">Submit for approval</button>
                        </div>
                    </form>
                )}
            </section>


            {!isVerified && (
                <section className="notice info">
                    You cannot vote or apply as a candidate until your voter profile is approved by an admin.
                </section>
            )}
        </>
    );


    const renderElectionsTab = () => (
        <section className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">All elections</p>
                    <h2>Elections & Candidate Registration</h2>
                </div>
                {!isVerified && <span className="pill subtle">Approval required to apply</span>}
            </div>


            {electionsLoading ? (
                <p className="muted">Loading elections...</p>
            ) : elections.length === 0 ? (
                <p className="muted">No elections available yet.</p>
            ) : (
                <div className="election-grid">
                    {elections.map((election) => {
                        const isRegClosed = election.regClose && new Date() > election.regClose;
                        const canRegister = isVerified && !isRegClosed && (election.status === "UPCOMING" || election.status === "ACTIVE");
                       
                        const getStatusColor = (status) => {
                            switch(status) {
                                case "ACTIVE": return "#28a745";
                                case "UPCOMING": return "#007bff";
                                case "COMPLETED": return "#6c757d";
                                default: return "#ffc107";
                            }
                        };
                       
                        return (
                            <div key={election.id} className="election-card">
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                        <h4 style={{ margin: 0 }}>{election.title}</h4>
                                        <span style={{
                                            padding: "4px 12px",
                                            borderRadius: "12px",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#fff",
                                            backgroundColor: getStatusColor(election.status)
                                        }}>
                                            {election.status}
                                        </span>
                                    </div>
                                    <p className="muted">{election.description}</p>
                                    <p className="muted small">Level: {election.level}</p>
                                    {election.regClose && (
                                        <p className="muted small" style={{ color: isRegClosed ? "#dc3545" : "#28a745" }}>
                                            Registration {isRegClosed ? "closed" : "closes"}: {election.regClose.toLocaleString()}
                                        </p>
                                    )}
                                    <p className="muted small">Starts: {election.startDate ? election.startDate.toLocaleString() : "N/A"}</p>
                                    <p className="muted small">Ends: {election.endDate ? election.endDate.toLocaleString() : "N/A"}</p>
                                </div>
                                <div className="card-actions">
                                    <button
                                        className="primary-btn"
                                        disabled={!canRegister}
                                        onClick={() => openCandidateForm(election)}
                                        title={!isVerified ? "Voter approval required" : isRegClosed ? "Registration closed" : canRegister ? "Click to register" : "Registration not available"}
                                    >
                                        {!isVerified ? "Get approval to apply" : isRegClosed ? "Registration closed" : canRegister ? "Register as candidate" : "Registration closed"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}


            {candidateSelection && (
                <div className="panel soft">
                    <div className="panel-header">
                        <div>
                            <p className="eyebrow">Application</p>
                            <h3>Register for {candidateSelection.title}</h3>
                            <p className="muted small">Submit your details to join the ballot.</p>
                        </div>
                        <button className="ghost-btn" onClick={() => setCandidateSelection(null)}>Close</button>
                    </div>


                    {candidateMessage.text && (
                        <div className={`status ${candidateMessage.type === "error" ? "error" : "success"}`}>
                            {candidateMessage.text}
                        </div>
                    )}


                    <form className="admin-form" onSubmit={handleCandidateSubmit}>
                        <div className="form-grid">
                            <label>
                                Party / affiliation
                                <input name="partyName" value={candidateForm.partyName} onChange={(e) => setCandidateForm({ ...candidateForm, partyName: e.target.value })} required />
                            </label>
                            <label>
                                Document type
                                <select name="documentType" value={candidateForm.documentType} onChange={(e) => setCandidateForm({ ...candidateForm, documentType: e.target.value })}>
                                    <option value="AADHAR">Aadhar</option>
                                    <option value="PAN">PAN</option>
                                    <option value="VOTER">Voter ID</option>
                                </select>
                            </label>
                            <label className="full">
                                Manifesto / pitch
                                <textarea
                                    name="manifesto"
                                    rows={3}
                                    value={candidateForm.manifesto}
                                    onChange={(e) => setCandidateForm({ ...candidateForm, manifesto: e.target.value })}
                                    required
                                />
                            </label>
                            <label className="full">
                                Upload supporting document
                                <input type="file" accept="image/*,application/pdf" onChange={(e) => setCandidateDoc(e.target.files?.[0] || null)} required />
                            </label>
                            <label className="full">
                                Upload symbol (optional)
                                <input type="file" accept="image/*" onChange={(e) => setCandidateSymbol(e.target.files?.[0] || null)} />
                            </label>
                        </div>
                        <div className="action-row">
                            <button type="submit" className="submit-btn">Send for approval</button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );


    const renderResultsTab = () => (
        <section className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Election outcomes</p>
                    <h2>Results</h2>
                </div>
            </div>


            {resultsLoading ? (
                <p className="muted">Loading results...</p>
            ) : results.length === 0 ? (
                <div className="notice info">No completed elections with results available yet.</div>
            ) : (
                <div className="election-grid">
                    {results.map((election) => (
                        <div key={election.id} className="election-card">
                            <div>
                                <h4>{election.title}</h4>
                                <p className="muted small">Level: {election.level}</p>
                                <p className="muted small">Status: {election.status}</p>
                            </div>
                            <div className="card-actions">
                                <button className="primary-btn">View Results</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );


    const renderPastVotesTab = () => (
        <section className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Voting history</p>
                    <h2>Past Votes</h2>
                </div>
            </div>


            {!isVerified ? (
                <div className="notice warning">
                    Get your profile approved to view your voting history.
                </div>
            ) : pastVotesLoading ? (
                <p className="muted">Loading your voting history...</p>
            ) : pastVotes.length === 0 ? (
                <div className="notice info">You haven't cast any votes yet.</div>
            ) : (
                <div className="votes-list">
                    {pastVotes.map((vote, index) => (
                        <div key={vote._id || index} className="vote-card">
                            <div className="vote-header">
                                <h4>{vote.electionTitle || vote.election?.title || "Unknown Election"}</h4>
                                <span className="pill success">Voted</span>
                            </div>
                            <div className="vote-details">
                                <p className="muted small">
                                    Voted on: {vote.timestamp ? new Date(vote.timestamp).toLocaleString() : "N/A"}
                                </p>
                                <p className="muted small">
                                    Transaction: {vote.transactionHash ? vote.transactionHash.substring(0, 20) + "..." : "Recorded"}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );


    return (
        <div className="voter-shell">
            <VoterNavbar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                badge={badge}
                onLogout={handleLogout}
            />


            <div className="voter-content">
                {activeTab === "profile" && renderProfileTab()}
                {activeTab === "elections" && renderElectionsTab()}
                {activeTab === "results" && renderResultsTab()}
                {activeTab === "past-votes" && renderPastVotesTab()}
            </div>
        </div>
    );
}


export default VoterHome;




