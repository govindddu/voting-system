const contract = require("../Blockchain/contract.js");
const Election = require("../models/Election.js");
const Candidate = require("../models/Candidate.js");
const Vote = require("../models/vote.js");
const Voter = require("../models/Voter.js");
const User = require("../models/User.js");
const { decrypt } = require("../utils/encryption.js");

const { ethers } = require("ethers");

const castVote = async (req, res) => {
  try {
    const userId = req.user.id;

    const { electionMongoId, candidateMongoId } = req.body;

    if (!electionMongoId || !candidateMongoId) {
      return res.status(400).json({
        message: "electionMongoId and candidateMongoId are required"
      });
    }

    // 1️⃣ voter profile check
    const voter = await Voter.findOne({ userId });
    if (!voter) {
      return res.status(404).json({ message: "Voter profile not found" });
    }

    if (voter.status !== "VERIFIED") {
      return res.status(403).json({ message: "Voter is not verified" });
    }

    // ✅ 1.5️⃣ Check if wallet is verified on blockchain
    if (!voter.walletAddress) {
      return res.status(400).json({ message: "Voter wallet address not found" });
    }

    const isWalletVerified = await contract.isVerifiedVoter(voter.walletAddress);
    if (!isWalletVerified) {
      return res.status(403).json({
        message: "Your wallet is not verified on blockchain. Please contact admin to verify your wallet."
      });
    }

    // 2️⃣ election check
    const election = await Election.findById(electionMongoId);
    if (!election) return res.status(404).json({ message: "Election not found" });

    if (!election.electionId) {
      return res.status(400).json({ message: "Election blockchain id missing" });
    }

    // ✅ Check election status and times
    const now = new Date();
    const startTime = new Date(election.electionStart);
    const endTime = new Date(election.electionEnd);

    if (now < startTime) {
      return res.status(400).json({
        message: `Election has not started yet. Starts at: ${startTime.toLocaleString()}`
      });
    }

    if (now > endTime) {
      return res.status(400).json({
        message: `Election has ended. Ended at: ${endTime.toLocaleString()}`
      });
    }

    // Lazy update: If time is valid but status is UPCOMING, update it to ONGOING
    if (election.status === "UPCOMING") {
      election.status = "ONGOING";
      await election.save();
    }

    // Allow ONGOING or ACTIVE (if legacy data exists)
    if (election.status !== "ONGOING" && election.status !== "ACTIVE") {
      return res.status(400).json({
        message: `Election status is ${election.status}, but voting is only allowed when status is ONGOING`
      });
    }

    // 3️⃣ candidate check
    const candidate = await Candidate.findById(candidateMongoId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    if (!candidate.blockchainCandidateId) {
      return res.status(400).json({ message: "Candidate blockchain id missing" });
    }

    if (String(candidate.electionId) !== String(election._id)) {
      return res.status(400).json({ message: "Candidate not in this election" });
    }

    // 4️⃣ prevent double vote in DB
    const alreadyVoted = await Vote.findOne({
      voterId: voter._id,
      electionId: election._id
    });

    if (alreadyVoted) {
      return res.status(400).json({ message: "Already voted (DB check)" });
    }

    // ✅ 5️⃣ Save vote in DB (blockchain vote already done by frontend)
    const vote = await Vote.create({
      voterId: voter._id,
      electionId: election._id,
      candidateId: candidate._id,
      blockchainTx: "" // Will be empty since frontend handles blockchain
    });

    return res.status(201).json({
      message: "Vote saved to database successfully",
      vote
    });

  } catch (err) {
    console.error("CAST_VOTE_ERROR:", err);
    return res.status(500).json({
      message: err.message || "Error casting vote",
      error: err.toString()
    });
  }
};

// =====================================
// CHECK IF VOTER ALREADY VOTED
// =====================================
const checkIfVoted = async (req, res) => {
  try {
    const userId = req.user.id;
    const { electionMongoId } = req.body;

    if (!electionMongoId) {
      return res.status(400).json({ message: "electionMongoId is required" });
    }

    // Get voter profile
    const voter = await Voter.findOne({ userId });
    if (!voter) {
      return res.status(404).json({ message: "Voter profile not found" });
    }

    // Check if already voted in this election
    const existingVote = await Vote.findOne({
      voterId: voter._id,
      electionId: electionMongoId
    }).populate("candidateId", "partyName");

    if (existingVote) {
      return res.json({
        hasVoted: true,
        message: "You have already voted in this election",
        votedFor: existingVote.candidateId?.partyName || "Unknown candidate",
        voteTime: existingVote.createdAt
      });
    }

    return res.json({
      hasVoted: false,
      message: "You can vote now"
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// =====================================
// CHECK IF WALLET IS VERIFIED ON BLOCKCHAIN
// =====================================
const checkWalletVerification = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get voter profile
    const voter = await Voter.findOne({ userId });
    if (!voter) {
      return res.status(404).json({ message: "Voter profile not found" });
    }

    if (!voter.walletAddress) {
      return res.json({
        isWalletVerified: false,
        message: "Wallet address not found in profile",
        walletAddress: null
      });
    }

    // Check blockchain verification
    const isVerified = await contract.isVerifiedVoter(voter.walletAddress);

    return res.json({
      isWalletVerified: isVerified,
      walletAddress: voter.walletAddress,
      message: isVerified
        ? "Your wallet is verified on blockchain"
        : "Your wallet is not verified on blockchain yet. Please contact admin."
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// =====================================
// GET VOTER'S VOTE IN AN ELECTION
// =====================================
const getVoterVote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { electionMongoId } = req.params;

    if (!electionMongoId) {
      return res.status(400).json({ message: "electionMongoId is required" });
    }

    // Get voter profile
    const voter = await Voter.findOne({ userId });
    if (!voter) {
      return res.status(404).json({ message: "Voter profile not found" });
    }

    // Get vote details
    const vote = await Vote.findOne({
      voterId: voter._id,
      electionId: electionMongoId
    }).populate("candidateId").populate("electionId");

    if (!vote) {
      return res.status(404).json({ message: "No vote found for this election" });
    }

    return res.json({
      vote,
      message: "Vote details retrieved successfully"
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  castVote,
  checkIfVoted,
  getVoterVote,
  checkWalletVerification
};
