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
    const [electionFilter, setElectionFilter] = useState("ACTIVE");
    const [candidateSelection, setCandidateSelection] = useState(null);
    const [candidateForm, setCandidateForm] = useState(defaultCandidateForm);
    const [candidateDoc, setCandidateDoc] = useState(null);
    const [candidateSymbol, setCandidateSymbol] = useState(null);
    const [candidateMessage, setCandidateMessage] = useState({ type: "", text: "" });

    const [myCandidateRegistrations, setMyCandidateRegistrations] = useState([]);
    const [myRegistrationsLoading, setMyRegistrationsLoading] = useState(false);
    const [selectedRegistrationDetail, setSelectedRegistrationDetail] = useState(null);
    const [myRegistrationResultsLoading, setMyRegistrationResultsLoading] = useState(false);
    const [myRegistrationResultsError, setMyRegistrationResultsError] = useState("");
    const [myRegistrationElectionResults, setMyRegistrationElectionResults] = useState(null);

    const [results, setResults] = useState([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [selectedResultElection, setSelectedResultElection] = useState(null);
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
        } else if (activeTab === "my-registrations") {
            fetchMyCandidateRegistrations();
            fetchResults();
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

            // Check if wallet is verified on blockchain - PRIORITY 1
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

            // Check if wallet is verified on blockchain
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

            // Use MetaMask to vote directly
            const contract = await getContract();

            const tx = await contract.vote(
                Number(voteSelection.blockchainElectionId),
                Number(candidate.blockchainCandidateId),
                { gasLimit: 500000 }
            );

            setVoteMessage({ type: "success", text: "⏳ Transaction sent! Waiting for confirmation..." });

            await tx.wait();

            // Save vote to MongoDB after blockchain confirmation
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
                    let computedStatus = details?.status || item.status || "UPCOMING";
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
                        category: details?.category || "",
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
                    const statusOrder = { "ACTIVE": 1, "UPCOMING": 2, "COMPLETED": 3 };
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
            const { data } = await axios.get(`${API_BASE}/votes/results/completed`);
            // Data format: [{electionTitle, electionId, candidates: [{candidateId, name, voteCount}]}]
            const completedElections = Array.isArray(data) ? data : [];
            setResults(completedElections);
        } catch (err) {
            console.error('Error fetching results:', err);
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

    const fetchMyCandidateRegistrations = async () => {
        if (!token) {
            setMyRegistrationsLoading(false);
            return;
        }
        setMyRegistrationsLoading(true);
        try {
            const { data } = await axios.get(`${API_BASE}/candidates/my-registrations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('My registrations response:', data);
            // Backend returns array directly
            const registrations = Array.isArray(data) ? data : (data.candidates || data.data || []);
            console.log('Parsed registrations:', registrations);
            setMyCandidateRegistrations(registrations);
        } catch (err) {
            console.error('Error fetching my registrations:', err);
            setMyCandidateRegistrations([]);
        } finally {
            setMyRegistrationsLoading(false);
        }
    }

    const fetchMyRegistrationElectionResults = async (electionMongoId) => {
        if (!electionMongoId) return;
        setMyRegistrationResultsLoading(true);
        setMyRegistrationResultsError("");
        setMyRegistrationElectionResults(null);
        try {
            const { data } = await axios.get(`${API_BASE}/votes/results/election/${electionMongoId}`);
            setMyRegistrationElectionResults(data);
        } catch (err) {
            const backendMsg = err.response?.data?.message || err.response?.data?.error;
            setMyRegistrationResultsError(backendMsg || "Failed to load results for this election.");
            setMyRegistrationElectionResults(null);
        } finally {
            setMyRegistrationResultsLoading(false);
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


    const renderElectionsTab = () => {
        // Filter elections based on selected filter
        const filteredElections = elections.filter(election => {
            if (electionFilter === "ALL") return true;
            return election.status === electionFilter;
        });

        return (
            <section className="panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">All elections</p>
                        <h2>Elections & Candidate Registration</h2>
                    </div>
                    {!isVerified && <span className="pill subtle">Approval required to apply</span>}
                </div>

                {/* Filter Buttons */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                    <button
                        onClick={() => setElectionFilter("ALL")}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "20px",
                            border: electionFilter === "ALL" ? "2px solid #007bff" : "2px solid #ddd",
                            backgroundColor: electionFilter === "ALL" ? "#007bff" : "#fff",
                            color: electionFilter === "ALL" ? "#fff" : "#333",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "14px",
                            transition: "all 0.2s"
                        }}
                    >
                        All ({elections.length})
                    </button>
                    <button
                        onClick={() => setElectionFilter("ACTIVE")}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "20px",
                            border: electionFilter === "ACTIVE" ? "2px solid #28a745" : "2px solid #ddd",
                            backgroundColor: electionFilter === "ACTIVE" ? "#28a745" : "#fff",
                            color: electionFilter === "ACTIVE" ? "#fff" : "#333",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "14px",
                            transition: "all 0.2s"
                        }}
                    >
                        Active ({elections.filter(e => e.status === "ACTIVE").length})
                    </button>
                    <button
                        onClick={() => setElectionFilter("UPCOMING")}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "20px",
                            border: electionFilter === "UPCOMING" ? "2px solid #007bff" : "2px solid #ddd",
                            backgroundColor: electionFilter === "UPCOMING" ? "#007bff" : "#fff",
                            color: electionFilter === "UPCOMING" ? "#fff" : "#333",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "14px",
                            transition: "all 0.2s"
                        }}
                    >
                        Upcoming ({elections.filter(e => e.status === "UPCOMING").length})
                    </button>
                    <button
                        onClick={() => setElectionFilter("COMPLETED")}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "20px",
                            border: electionFilter === "COMPLETED" ? "2px solid #6c757d" : "2px solid #ddd",
                            backgroundColor: electionFilter === "COMPLETED" ? "#6c757d" : "#fff",
                            color: electionFilter === "COMPLETED" ? "#fff" : "#333",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "14px",
                            transition: "all 0.2s"
                        }}
                    >
                        Completed ({elections.filter(e => e.status === "COMPLETED").length})
                    </button>
                </div>

                {electionsLoading ? (
                    <p className="muted">Loading elections...</p>
                ) : filteredElections.length === 0 ? (
                    <p className="muted">No {electionFilter === "ALL" ? "" : electionFilter.toLowerCase()} elections available.</p>
                ) : (
                    <div className="election-grid">
                        {filteredElections.map((election) => {
                            const isRegClosed = election.regClose && new Date() > election.regClose;
                            const canRegister = isVerified && !isRegClosed && (election.status === "UPCOMING" || election.status === "ACTIVE");

                            // Check if voting is allowed: only when election is ACTIVE (today between start and end)
                            const canVote = election.status === "ACTIVE" && election.startDate && election.endDate &&
                                new Date() >= election.startDate && new Date() <= election.endDate;

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
                                        {election.category && <p className="muted small">Category: {election.category}</p>}
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

                                        {canVote && (
                                            <button
                                                className="ghost-btn"
                                                onClick={() => openVotePanel(election)}
                                            >
                                                Vote Now
                                            </button>
                                        )}
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
        };
    
        const renderResultsTab = () => {
            // If viewing detailed results for a specific election
            if (selectedResultElection) {
                const totalVotes = selectedResultElection.candidates.reduce((sum, c) => sum + c.voteCount, 0);
                const sortedCandidates = [...selectedResultElection.candidates].sort((a, b) => b.voteCount - a.voteCount);

                return (
                    <section className="panel">
                        <div className="panel-header">
                            <div>
                                <p className="eyebrow">Election Results</p>
                                <h2>{selectedResultElection.electionTitle}</h2>
                                <p className="muted small">Total Candidates: {selectedResultElection.candidates.length} | Total Votes: {totalVotes}</p>
                            </div>
                            <button className="ghost-btn" onClick={() => setSelectedResultElection(null)}>Back to Results</button>
                        </div>

                        {selectedResultElection.candidates.length === 0 ? (
                            <div className="notice info">No candidates registered for this election.</div>
                        ) : (
                            <div style={{ marginTop: "20px" }}>
                                <h3 style={{ marginBottom: "15px" }}>Vote Distribution</h3>
                                <div className="results-list">
                                    {sortedCandidates.map((candidate, index) => {
                                        const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(2) : 0;

                                        return (
                                            <div
                                                key={candidate.candidateId}
                                                style={{
                                                    padding: "15px 20px",
                                                    marginBottom: "12px",
                                                    border: "1px solid #e0e0e0",
                                                    borderRadius: "8px",
                                                    backgroundColor: index === 0 && candidate.voteCount > 0 ? "#f0f8ff" : "#fff",
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                                        <span style={{
                                                            fontSize: "20px",
                                                            fontWeight: "bold",
                                                            color: index === 0 && candidate.voteCount > 0 ? "#28a745" : "#666",
                                                            minWidth: "30px"
                                                        }}>
                                                            #{index + 1}
                                                        </span>
                                                        <div>
                                                            <h4 style={{ margin: 0, fontSize: "18px" }}>
                                                                {index === 0 && candidate.voteCount > 0 && "🏆 "}
                                                                {candidate.name}
                                                            </h4>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: "right" }}>
                                                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}>
                                                            {candidate.voteCount}
                                                        </div>
                                                        <div className="muted small">{percentage}%</div>
                                                    </div>
                                                </div>
                                                {totalVotes > 0 && (
                                                    <div style={{
                                                        height: "8px",
                                                        backgroundColor: "#f0f0f0",
                                                        borderRadius: "4px",
                                                        overflow: "hidden"
                                                    }}>
                                                        <div style={{
                                                            height: "100%",
                                                            width: `${percentage}%`,
                                                            backgroundColor: index === 0 && candidate.voteCount > 0 ? "#28a745" : "#007bff",
                                                            transition: "width 0.3s ease"
                                                        }} />
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
            }

            // List all completed elections
            return (
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
                            {results.map((election) => {
                                const totalVotes = election.candidates.reduce((sum, c) => sum + c.voteCount, 0);
                                const winner = election.candidates.length > 0
                                    ? election.candidates.reduce((max, c) => c.voteCount > max.voteCount ? c : max)
                                    : null;

                                return (
                                    <div key={election.electionId} className="election-card">
                                        <div>
                                            <h4>{election.electionTitle}</h4>
                                            <p className="muted small">Election ID: {election.electionId}</p>
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
    
        const renderMyRegistrationsTab = () => (
            <section className="panel">
                <div className="panel-header">
                    <div>
                        <p className="eyebrow">Candidate Applications</p>
                        <h2>My Candidate Registrations</h2>
                    </div>
                </div>

                {!isVerified ? (
                    <div className="notice warning">
                        Get your voter profile approved to view your candidate registrations.
                    </div>
                ) : myRegistrationsLoading ? (
                    <p className="muted">Loading your candidate registrations...</p>
                ) : myCandidateRegistrations.length === 0 ? (
                    <div className="notice info">You haven't registered as a candidate yet. Go to Elections tab to register.</div>
                ) : (
                    <div className="election-grid">
                        {myCandidateRegistrations.map((registration) => {
                            const getStatusColor = (status) => {
                                switch (status) {
                                    case "VERIFIED": return "#28a745";
                                    case "PENDING": return "#ffc107";
                                    case "REJECTED": return "#dc3545";
                                    default: return "#6c757d";
                                }
                            };

                            const getStatusLabel = (status) => {
                                switch (status) {
                                    case "VERIFIED": return "Approved";
                                    case "PENDING": return "Under Review";
                                    case "REJECTED": return "Rejected";
                                    default: return status;
                                }
                            };

                            const electionInfo = registration.electionId || registration.election;
                            const now = new Date();
                            const startDate = electionInfo?.electionStart ? new Date(electionInfo.electionStart) : null;
                            const endDate = electionInfo?.electionEnd ? new Date(electionInfo.electionEnd) : null;
                            
                            let electionStatus = "UPCOMING";
                            if (startDate && endDate) {
                                if (now < startDate) {
                                    electionStatus = "UPCOMING";
                                } else if (now >= startDate && now <= endDate) {
                                    electionStatus = "ACTIVE";
                                } else if (now > endDate) {
                                    electionStatus = "COMPLETED";
                                }
                            }

                            return (
                                <button
                                    key={registration._id}
                                    className="election-card"
                                    onClick={() => {
                                        console.log('Clicked registration:', registration);
                                        setSelectedRegistrationDetail(registration);

                                        setMyRegistrationResultsLoading(false);
                                        setMyRegistrationResultsError("");
                                        setMyRegistrationElectionResults(null);

                                        const electionInfo = registration.electionId || registration.election;
                                        const now = new Date();
                                        const endDate = electionInfo?.electionEnd ? new Date(electionInfo.electionEnd) : null;
                                        const electionMongoId = electionInfo?._id;

                                        if (endDate && now > endDate && electionMongoId) {
                                            fetchMyRegistrationElectionResults(electionMongoId);
                                        }
                                    }}
                                    style={{
                                        cursor: "pointer",
                                        transition: "transform 0.2s, box-shadow 0.2s",
                                        border: "1px solid #e0e0e0",
                                        background: "#fff",
                                        textAlign: "left",
                                        width: "100%"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                            <h4 style={{ margin: 0 }}>{registration.electionTitle || registration.election?.title || "Unknown Election"}</h4>
                                            <span style={{
                                                padding: "4px 12px",
                                                borderRadius: "12px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                color: "#fff",
                                                backgroundColor: getStatusColor(registration.status)
                                            }}>
                                                {getStatusLabel(registration.status)}
                                            </span>
                                        </div>
                                        <p className="muted small">Party: <strong>{registration.partyName}</strong></p>
                                        <p className="muted small">Manifesto: {registration.manifesto || "N/A"}</p>
                                        <p className="muted small">Applied on: {registration.createdAt ? new Date(registration.createdAt).toLocaleString() : "N/A"}</p>
                                        {registration.blockchainCandidateId && (
                                            <p className="muted small" style={{ color: "#28a745", fontWeight: "600" }}>
                                                ✓ Registered on Blockchain (ID: {registration.blockchainCandidateId})
                                            </p>
                                        )}
                                        <p className="muted small" style={{ marginTop: "10px", color: "#007bff", fontWeight: "600" }}>
                                            👁️ Click to view election details
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {selectedRegistrationDetail && (
                    <div className="panel soft">
                        <div className="panel-header">
                            <div>
                                <p className="eyebrow">Registration Details</p>
                                <h3>{selectedRegistrationDetail.electionTitle || selectedRegistrationDetail.election?.title || "Election Details"}</h3>
                            </div>
                            <button className="ghost-btn" onClick={() => setSelectedRegistrationDetail(null)}>Close</button>
                        </div>

                        <div style={{ display: "grid", gap: "20px" }}>
                            {/* Registration Status Section */}
                            <div style={{ padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                                <h4 style={{ marginTop: 0 }}>Your Registration Status</h4>
                                <div style={{ display: "grid", gap: "10px" }}>
                                    <p className="muted small">Status: <span style={{
                                        padding: "4px 12px",
                                        borderRadius: "12px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "#fff",
                                        backgroundColor: selectedRegistrationDetail.status === "VERIFIED" ? "#28a745" : selectedRegistrationDetail.status === "PENDING" ? "#ffc107" : "#dc3545"
                                    }}>
                                        {selectedRegistrationDetail.status === "VERIFIED" ? "Approved" : selectedRegistrationDetail.status === "PENDING" ? "Under Review" : "Rejected"}
                                    </span></p>
                                    <p className="muted small">Party: <strong>{selectedRegistrationDetail.partyName}</strong></p>
                                    <p className="muted small">Manifesto: {selectedRegistrationDetail.manifesto || "N/A"}</p>
                                    <p className="muted small">Applied on: {selectedRegistrationDetail.createdAt ? new Date(selectedRegistrationDetail.createdAt).toLocaleString() : "N/A"}</p>
                                    {selectedRegistrationDetail.blockchainCandidateId && (
                                        <p className="muted small" style={{ color: "#28a745", fontWeight: "600" }}>
                                            ✓ Registered on Blockchain (ID: {selectedRegistrationDetail.blockchainCandidateId})
                                        </p>
                                    )}
                                    {selectedRegistrationDetail.status === "REJECTED" && selectedRegistrationDetail.remarks && (
                                        <div style={{
                                            marginTop: "10px",
                                            padding: "10px",
                                            backgroundColor: "#fff3cd",
                                            borderLeft: "3px solid #ffc107",
                                            borderRadius: "4px"
                                        }}>
                                            <p className="muted small" style={{ margin: 0, color: "#856404" }}>
                                                <strong>Rejection Reason:</strong> {selectedRegistrationDetail.remarks}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Election Information Section */}
                            {(() => {
                                const electionInfo = selectedRegistrationDetail.electionId || selectedRegistrationDetail.election;
                                return electionInfo;
                            })() && (
                                <div style={{ padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                                    <h4 style={{ marginTop: 0 }}>Election Information</h4>
                                    <div style={{ display: "grid", gap: "10px" }}>
                                        {(() => {
                                            const electionInfo = selectedRegistrationDetail.electionId || selectedRegistrationDetail.election;
                                            return (
                                                <>
                                                    <p className="muted small">Title: <strong>{electionInfo.title}</strong></p>
                                                    <p className="muted small">Level: <strong>{electionInfo.level}</strong></p>
                                                    {electionInfo.description && (
                                                        <p className="muted small">Description: {electionInfo.description}</p>
                                                    )}
                                                    {electionInfo.electionStart && (
                                                        <p className="muted small">Start Date: {new Date(electionInfo.electionStart).toLocaleString()}</p>
                                                    )}
                                                    {electionInfo.electionEnd && (
                                                        <p className="muted small">End Date: {new Date(electionInfo.electionEnd).toLocaleString()}</p>
                                                    )}
                                                    <p className="muted small">Election Status: <span style={{
                                                        padding: "4px 12px",
                                                        borderRadius: "12px",
                                                        fontSize: "12px",
                                                        fontWeight: "600",
                                                        color: "#fff",
                                                        backgroundColor: (() => {
                                                            const now = new Date();
                                                            const start = electionInfo.electionStart ? new Date(electionInfo.electionStart) : null;
                                                            const end = electionInfo.electionEnd ? new Date(electionInfo.electionEnd) : null;
                                                            if (start && end) {
                                                                if (now < start) return "#007bff";
                                                                if (now >= start && now <= end) return "#28a745";
                                                                if (now > end) return "#6c757d";
                                                            }
                                                            return "#6c757d";
                                                        })()
                                                    }}>
                                                        {(() => {
                                                            const now = new Date();
                                                            const start = electionInfo.electionStart ? new Date(electionInfo.electionStart) : null;
                                                            const end = electionInfo.electionEnd ? new Date(electionInfo.electionEnd) : null;
                                                            if (start && end) {
                                                                if (now < start) return "UPCOMING";
                                                                if (now >= start && now <= end) return "ACTIVE";
                                                                if (now > end) return "COMPLETED";
                                                            }
                                                            return "UNKNOWN";
                                                        })()}
                                                    </span></p>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Results Section */}
                            {false && (
                           <div style={{ padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
  <h4 style={{ marginTop: 0 }}>Election Results</h4>
  {(() => {
    const electionInfo = selectedRegistrationDetail.electionId || selectedRegistrationDetail.election;
    const now = new Date();
    const end = electionInfo?.electionEnd ? new Date(electionInfo.electionEnd) : null;
    const isCompleted = end && now > end;

    // 1. Check if election is still active
    if (!isCompleted) {
      return (
        <div className="notice info" style={{ marginTop: "10px" }}>
          Results will be available after the election ends.
        </div>
      );
    }

    // 2. Determine which data source to use
    if (myRegistrationResultsLoading || resultsLoading) {
      return <p className="muted">Loading results...</p>;
    }

    if (myRegistrationResultsError) {
      return (
        <div className="notice warning" style={{ marginTop: "10px" }}>
          {myRegistrationResultsError}
        </div>
      );
    }

    // Identify the correct results object
    const match = myRegistrationElectionResults || results.find((r) => Number(r.electionId) === Number(electionInfo?.electionId));

    if (!match || !Array.isArray(match.candidates)) {
      return (
        <div className="notice info" style={{ marginTop: "10px" }}>
          Results not available for this election.
        </div>
      );
    }

    // 3. Process and Render Data
    const totalVotes = match.candidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);
    const sortedCandidates = [...match.candidates].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

    if (sortedCandidates.length === 0) {
      return (
        <div className="notice info" style={{ marginTop: "10px" }}>
          No candidates registered for this election.
        </div>
      );
    }

    return (
      <div style={{ marginTop: "10px" }}>
        <p className="muted small">
          Total Candidates: {sortedCandidates.length} | Total Votes: {totalVotes}
        </p>
        <h3 style={{ marginBottom: "15px" }}>Vote Distribution</h3>
        
        <div className="results-list">
          {sortedCandidates.map((candidate, index) => {
            const voteCount = candidate.voteCount || 0;
            const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(2) : 0;
            const isWinner = index === 0 && voteCount > 0;

            return (
              <div
                key={candidate.candidateId ?? candidate.candidateMongoId ?? index}
                style={{
                  padding: "15px 20px",
                  marginBottom: "12px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  backgroundColor: isWinner ? "#f0f8ff" : "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                    <span style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: isWinner ? "#28a745" : "#666",
                      minWidth: "30px"
                    }}>
                      #{index + 1}
                    </span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "18px" }}>
                        {isWinner && "🏆 "}
                        {candidate.name}
                      </h4>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}>
                      {voteCount}
                    </div>
                    <div className="muted small">{percentage}%</div>
                  </div>
                </div>

                {totalVotes > 0 && (
                  <div style={{ height: "8px", backgroundColor: "#f0f0f0", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${percentage}%`,
                      backgroundColor: isWinner ? "#28a745" : "#007bff",
                      transition: "width 0.3s ease"
                    }} />
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
    );
  })()}
</div>
                            )}
                            {/* Active/Upcoming Election Notice */}
                            {(() => {
                                const electionInfo = selectedRegistrationDetail.electionId || selectedRegistrationDetail.election;
                                const now = new Date();
                                const end = electionInfo?.electionEnd ? new Date(electionInfo.electionEnd) : null;
                                return (!end || now <= end) && selectedRegistrationDetail.status === "VERIFIED";
                            })() && (
                                <div style={{
                                    padding: "15px",
                                    backgroundColor: "#d4edda",
                                    borderLeft: "3px solid #28a745",
                                    borderRadius: "8px"
                                }}>
                                    <p className="muted small" style={{ margin: 0, color: "#155724" }}>
                                        <strong>✓ You're in the running!</strong> Voters can now cast their votes for you in this election. Good luck!
                                    </p>
                                </div>
                            )}
                        </div>
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
                {activeTab === "my-registrations" && renderMyRegistrationsTab()}
                {activeTab === "results" && renderResultsTab()}
                {activeTab === "past-votes" && renderPastVotesTab()}
            </div>
        </div >
    );
}

export default VoterHome;