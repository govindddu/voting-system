import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import VoterNavbar from "../components/VoterNavbar";
import { getContract } from "../blockchain/contract";
import { ethers } from "ethers";


const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";


const defaultProfileForm = {
    walletAddress: "",
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
    const [walletAddress, setWalletAddress] = useState("");
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletError, setWalletError] = useState("");

    const [voteSelection, setVoteSelection] = useState(null);
    const [voteCandidates, setVoteCandidates] = useState([]);
    const [voteLoading, setVoteLoading] = useState(false);
    const [voteMessage, setVoteMessage] = useState({ type: "", text: "" });
    const [hasAlreadyVoted, setHasAlreadyVoted] = useState(false);
    const [alreadyVotedFor, setAlreadyVotedFor] = useState(null);
    const [isWalletVerified, setIsWalletVerified] = useState(null);
    const [walletVerificationMessage, setWalletVerificationMessage] = useState("");


    const statusBadge = (status) => {
        if (status === "VERIFIED") return { label: "Approved", tone: "success" };
        if (status === "REJECTED") return { label: "Rejected", tone: "error" };
        if (status === "PENDING") return { label: "Pending review", tone: "warning" };
        return { label: "Profile missing", tone: "error" };
    };

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
        const checkNetwork = async () => {
            if (!window.ethereum) {
                console.log("MetaMask not found");
                return;
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const network = await provider.getNetwork();

            console.log("Connected Network:", network);
            console.log("Chain ID:", network.chainId.toString());
        };

        checkNetwork();
    }, []);



    useEffect(() => {
        if (activeTab === "results") {
            fetchResults();
        } else if (activeTab === "past-votes") {
            fetchPastVotes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const connectWallet = async () => {
        try {
            setWalletError("");

            if (!window.ethereum) {
                setWalletError("MetaMask not installed");
                return;
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            const connectedWallet = accounts[0];

            // Store the connected wallet for display purposes
            setWalletAddress(connectedWallet);
            setWalletConnected(true);
            setWalletError("");
        } catch (err) {
            setWalletError(err.message);
        }
    };

    const openVotePanel = async (election) => {
        try {
            setVoteSelection(election);
            setVoteMessage({ type: "", text: "" });
            setVoteLoading(true);
            setHasAlreadyVoted(false);
            setAlreadyVotedFor(null);
            setIsWalletVerified(null);
            setWalletVerificationMessage("");

            // ✅ Check if wallet is verified on blockchain - PRIORITY 1
            try {
                const walletRes = await axios.get(
                    `${API_BASE}/votes/check-wallet`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                setIsWalletVerified(walletRes.data.isWalletVerified);
                if (!walletRes.data.isWalletVerified) {
                    const verificationMsg = walletRes.data.message || "Your wallet is not verified on blockchain";
                    setWalletVerificationMessage(verificationMsg);
                    setVoteMessage({
                        type: "error",
                        text: `❌ ${verificationMsg}`
                    });
                    setVoteLoading(false);
                    return; // Stop here - don't show other errors
                }
            } catch (err) {
                console.error("Wallet verification check error:", err);
                const errorMsg = err.response?.data?.message || err.message || "Could not verify wallet status";
                setIsWalletVerified(false);
                setWalletVerificationMessage(errorMsg);
                setVoteMessage({
                    type: "error",
                    text: `❌ ${errorMsg}`
                });
                setVoteLoading(false);
                return; // Stop here - don't show other errors
            }

            // Check if voter has already voted in this election - PRIORITY 2
            try {
                const checkRes = await axios.post(
                    `${API_BASE}/votes/check-voted`,
                    { electionMongoId: election.id },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (checkRes.data.hasVoted) {
                    setHasAlreadyVoted(true);
                    setAlreadyVotedFor(checkRes.data.votedFor);
                    setVoteMessage({
                        type: "warning",
                        text: `⚠️ You have already voted for: ${checkRes.data.votedFor}`
                    });
                    setVoteLoading(false);
                    return; // Stop here - don't load candidates
                }
            } catch (err) {
                // If check fails, continue with voting flow
                console.error("Vote check error:", err);
            }

            // Fetch candidates for this election (status: VERIFIED)
            try {
                const res = await axios.get(
                    `${API_BASE}/candidates/election/${election.id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                setVoteCandidates(res.data.candidates || []);
            } catch (err) {
                const backendMsg = err.response?.data?.message;
                const backendError = err.response?.data?.error;
                const errorText = backendMsg || backendError || err.message || "Failed to load candidates";

                setVoteMessage({
                    type: "error",
                    text: `❌ ${errorText}`,
                });
            }
        } finally {
            setVoteLoading(false);
        }
    }

    const handleVote = async (candidate) => {
        try {
            setVoteMessage({ type: "", text: "" });

            // ✅ Check if wallet is verified on blockchain
            if (isWalletVerified === false) {
                setVoteMessage({
                    type: "error",
                    text: `❌ ${walletVerificationMessage}`
                });
                return;
            }

            // Check if already voted
            if (hasAlreadyVoted) {
                setVoteMessage({ type: "error", text: "❌ You have already voted in this election. One vote per person." });
                return;
            }

            if (!walletConnected) {
                setVoteMessage({ type: "error", text: "❌ Please connect MetaMask first" });
                return;
            }

            if (!voteSelection?.blockchainElectionId) {
                setVoteMessage({ type: "error", text: "❌ Blockchain electionId missing" });
                return;
            }

            if (!candidate.blockchainCandidateId) {
                setVoteMessage({ type: "error", text: "❌ Candidate blockchainCandidateId missing" });
                return;
            }

            setVoteMessage({ type: "info", text: "📝 MetaMask will open to confirm your vote..." });

            // ✅ Use MetaMask to vote directly
            const contract = await getContract();

            const tx = await contract.vote(
                Number(voteSelection.blockchainElectionId),
                Number(candidate.blockchainCandidateId),
                { gasLimit: 500000 }
            );

            setVoteMessage({ type: "success", text: "⏳ Transaction sent! Waiting for confirmation..." });

            await tx.wait();

            // ✅ Save vote to MongoDB after blockchain confirmation
            try {
                await axios.post(
                    `${API_BASE}/votes/cast`,
                    {
                        electionMongoId: voteSelection.id,
                        candidateMongoId: candidate._id
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                setVoteMessage({
                    type: "success",
                    text: `✅ Vote cast successfully! Your vote has been recorded on the blockchain (${tx.hash.substring(0, 20)}...) and saved to our database.`
                });
                setHasAlreadyVoted(true);
                setAlreadyVotedFor(candidate.partyName);
            } catch (saveErr) {
                // Backend error saving to DB - extract the proper error message
                const backendError = saveErr.response?.data;
                let errorMessage = "";

                if (backendError?.message) {
                    errorMessage = backendError.message;
                } else if (backendError?.error) {
                    errorMessage = backendError.error;
                } else if (backendError?.details) {
                    errorMessage = backendError.details;
                } else if (saveErr.message) {
                    errorMessage = saveErr.message;
                } else {
                    errorMessage = "Unknown error while saving vote to database";
                }

                // Show backend error even though blockchain vote succeeded
                setVoteMessage({
                    type: "warning",
                    text: `⚠️ Your vote was recorded on blockchain (${tx.hash.substring(0, 20)}...) but encountered an issue: ${errorMessage}`
                });
            }
        } catch (err) {
            console.error("Vote error:", err);

            // Helper to extract the most relevant error message
            const extractErrorMessage = (error) => {
                if (!error) return "Unknown error";

                // 1. Check for backend API errors first
                if (error.response?.data?.message) {
                    return error.response.data.message;
                }

                // 2. Check for Solidity revert reason (Best Case)
                if (error.reason) return error.reason;

                // 3. User Rejected
                if (error.code === "ACTION_REJECTED" || error.code === 4001) {
                    return "You cancelled the transaction.";
                }

                // 4. Nested RPC Errors (MetaMask/Ethers wrapper)
                if (error.info?.error?.message) return error.info.error.message;
                if (error.info?.message) return error.info.message;
                if (error.data?.message) return error.data.message;

                // 5. Look for inner error
                if (error.error) {
                    // Recurse into inner error if present
                    const innerMsg = extractErrorMessage(error.error);
                    if (innerMsg && innerMsg !== "Unknown error" && !innerMsg.includes("coalesce")) {
                        return innerMsg;
                    }
                }

                // 6. Ethers v6 short message
                if (error.shortMessage) return error.shortMessage;

                // 7. Parse string message for common patterns
                if (error.message) {
                    // Handle "could not coalesce error" specifically - ignore it and return generic if nothing else found
                    if (error.message.includes("could not coalesce error")) {
                        // Try to find a better message in other properties that might have been missed
                        // or return a sensible default for contract failures
                        return "Smart Contract Verification Failed. Checks: 1. You are verified? 2. Election Active? 3. Already Voted?";
                    }

                    // Extract "execution reverted: reason"
                    const revertMatch = error.message.match(/execution reverted: ([^"]*)/);
                    if (revertMatch) return revertMatch[1];

                    // Extract "reason string '...'"
                    const reasonStringMatch = error.message.match(/reason string '([^']*)'/);
                    if (reasonStringMatch) return reasonStringMatch[1];

                    return error.message;
                }

                return "Transaction failed";
            };

            let finalMessage = extractErrorMessage(err);

            // Cleanup common technical junk
            finalMessage = finalMessage.replace("execution reverted:", "").trim();
            finalMessage = finalMessage.replace("Internal JSON-RPC error.", "").trim();
            if (finalMessage.toLowerCase().includes("user rejected")) {
                finalMessage = "Transaction cancelled by user.";
            }

            // If message is still huge (code dump), default to generic
            if (finalMessage.length > 200 || finalMessage.includes("{")) {
                finalMessage = "Vote failed. Please ensure you are verified and the election is active.";
            }

            setVoteMessage({
                type: "error",
                text: `❌ ${finalMessage}`,
            });
        }
    }

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
                walletAddress: data.walletAddress || "",
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
    }

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
                        blockchainElectionId: details?.electionId || item.electionId,
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
    }

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
    }

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
    }

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileForm((prev) => ({ ...prev, [name]: value }));
    }

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
        if (!profileForm.walletAddress) {
            setProfileMessage({ type: "error", text: "Wallet address is required." });
            return;
        }
        // Basic wallet address validation (Ethereum-like)
        if (!/^0x[a-fA-F0-9]{40}$/.test(profileForm.walletAddress)) {
            setProfileMessage({ type: "error", text: "Enter a valid wallet address (starts with 0x and 42 chars)." });
            return;
        }


        const formData = new FormData();
        Object.entries(profileForm).forEach(([key, value]) => {
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
    }

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (!token) {
            setProfileMessage({ type: "error", text: "Please sign in to update your profile." });
            return;
        }


        const formData = new FormData();
        Object.entries(profileForm).forEach(([key, value]) => {
            if (key !== "walletAddress" && value) {
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
    }

    const handleEditProfile = () => {
        setIsEditingProfile(true);
        setProfileMessage({ type: "", text: "" });
    }

    const handleCancelEdit = () => {
        setIsEditingProfile(false);
        setDocumentFile(null);
        setProfileMessage({ type: "", text: "" });
        // Reset form to current profile data
        if (profile) {
            setProfileForm({
                walletAddress: profile.walletAddress || "",
                dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : "",
                gender: profile.gender || "Male",
                address: profile.address || "",
                state: profile.state || "",
                district: profile.district || "",
                pincode: profile.pincode || "",
                documentType: profile.documentType || "AADHAR"
            });
        }
    }

    const openCandidateForm = (election) => {
        setCandidateSelection(election);
        setCandidateForm(defaultCandidateForm);
        setCandidateDoc(null);
        setCandidateSymbol(null);
        setCandidateMessage({ type: "", text: "" });
    }


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
    }

    const badge = statusBadge(profileStatus);


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
                                <p className="muted small">Wallet Address</p>
                                <strong>{profile.walletAddress || "N/A"}</strong>
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
                                Wallet Address (cannot change)
                                <input
                                    name="walletAddress"
                                    value={profileForm.walletAddress}
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
                                Wallet Address
                                <input
                                    name="walletAddress"
                                    value={profileForm.walletAddress}
                                    onChange={handleProfileChange}
                                    placeholder="0x..."
                                    required
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
                            switch (status) {
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

                                    <button
                                        className="ghost-btn"
                                        onClick={() => openVotePanel(election)}
                                    >
                                        Vote Now
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

            {voteSelection && (
                <div className="panel soft">
                    <div className="panel-header">
                        <div>
                            <p className="eyebrow">Voting</p>
                            <h3>Vote in {voteSelection.title}</h3>
                            <p className="muted small">
                                Your Registered Wallet: <strong>{profile?.walletAddress || "Not registered"}</strong>
                            </p>
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                            {!walletConnected && (
                                <button className="primary-btn" onClick={connectWallet}>
                                    Connect MetaMask
                                </button>
                            )}

                            <button className="ghost-btn" onClick={() => setVoteSelection(null)}>
                                Close
                            </button>
                        </div>
                    </div>

                    {walletError && <div className="status error">{walletError}</div>}

                    {voteMessage.text && (
                        <div className={`status ${voteMessage.type === "error" ? "error" : "success"}`}>
                            {voteMessage.text}
                        </div>
                    )}

                    {voteLoading ? (
                        <p className="muted">Loading candidates...</p>
                    ) : voteCandidates.length === 0 ? (
                        <p className="muted">No approved candidates found.</p>
                    ) : (
                        <div className="election-grid">
                            {voteCandidates.map((c) => (
                                <div key={c._id} className="election-card">
                                    <h4 style={{ margin: 0 }}>{c.partyName}</h4>
                                    <p className="muted small">{c.manifesto}</p>

                                    <button
                                        className="primary-btn"
                                        onClick={() => handleVote(c)}
                                        disabled={hasAlreadyVoted || isWalletVerified === false}
                                        style={{ opacity: (hasAlreadyVoted || isWalletVerified === false) ? 0.5 : 1, cursor: (hasAlreadyVoted || isWalletVerified === false) ? 'not-allowed' : 'pointer' }}
                                    >
                                        {isWalletVerified === false ? "Wallet Not Verified" : hasAlreadyVoted ? `Voted for ${alreadyVotedFor}` : "Vote"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
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
        <div className="voter-shell" >
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
        </div >
    );
}


export default VoterHome;