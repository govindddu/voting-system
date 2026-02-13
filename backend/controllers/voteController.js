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


/**
 * GET RESULTS FROM BLOCKCHAIN
 * GET /api/votes/results/:electionMongoId
 */
const getElectionResults = async (req, res) => {
  try {
    const { electionMongoId } = req.params;

    // 1️⃣ Find election from MongoDB
    const election = await Election.findById(electionMongoId);

    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    if (!election.electionId) {
      return res.status(400).json({
        message: "Blockchain electionId missing in DB"
      });
    }

    const blockchainElectionId = Number(election.electionId);

    // 2️⃣ Get total candidates from blockchain
    const totalCandidates = await contract.getCandidateCount(blockchainElectionId);

    const results = [];

    // 3️⃣ Loop through candidates
    for (let i = 1; i <= Number(totalCandidates); i++) {

      const chainCandidate = await contract.getCandidate(
        blockchainElectionId,
        i
      );

      // Find Mongo candidate
      const mongoCandidate = await Candidate.findOne({
        blockchainCandidateId: i,
        electionId: electionMongoId
      }).populate("userId", "fullName");

      results.push({
        candidateId: i,
        name: chainCandidate.name,
        wallet: chainCandidate.wallet,
        votes: Number(chainCandidate.voteCount),
        candidateName: mongoCandidate?.userId?.fullName || "Unknown"
      });
    }

    res.json({
      electionTitle: election.title,
      totalCandidates: Number(totalCandidates),
      results
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllCompletedResults = async (req, res) => {
  try {
    const now = new Date();

    // 1️⃣ Get completed elections
    const elections = await Election.find({
      electionEnd: { $lt: now }
    });

    const results = [];

    // 2️⃣ Loop elections
    for (const election of elections) {
      const blockchainElectionId = election.electionId;

      if (!blockchainElectionId) continue;

      // 3️⃣ Get candidate count from blockchain
      const count = await contract.getCandidateCount(blockchainElectionId);

      const candidates = [];

      // 4️⃣ Loop candidates
      for (let i = 1; i <= Number(count); i++) {
        const c = await contract.getCandidate(blockchainElectionId, i);

        candidates.push({
          candidateId: i,
          name: c.name,
          wallet: c.wallet,
          voteCount: Number(c.voteCount)
        });
      }

      results.push({
        electionTitle: election.title,
        electionId: blockchainElectionId,
        candidates
      });
    }

    res.json(results);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get results for a specific election by MongoDB ID
const getElectionResultsByMongoId = async (req, res) => {
  try {
    const { electionMongoId } = req.params;

    // Find election
    const election = await Election.findById(electionMongoId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    const now = new Date();
    const endDate = election.electionEnd ? new Date(election.electionEnd) : null;
    if (!endDate || now <= endDate) {
      return res.status(400).json({
        message: "Election is still ongoing. Results will be available after the election ends."
      });
    }

    const blockchainElectionId = Number(election.electionId);

    // Get all candidates for this election
    const dbCandidates = await Candidate.find({
      electionId: election._id
    });

    const candidates = [];

    for (const dbCandidate of dbCandidates) {
      const blockchainCandidateId = dbCandidate.blockchainCandidateId
        ? Number(dbCandidate.blockchainCandidateId)
        : null;

      let voteCount = 0;
      if (blockchainElectionId && blockchainCandidateId) {
        try {
          // Use getCandidate function which returns {id, name, voteCount}
          const candidateData = await contract.getCandidate(
            blockchainElectionId,
            blockchainCandidateId
          );
          voteCount = Number(candidateData.voteCount || candidateData[2] || 0);
        } catch (err) {
          console.error(`Error getting votes for candidate ${blockchainCandidateId}:`, err.message);
          voteCount = 0;
        }
      }

      candidates.push({
        candidateMongoId: dbCandidate._id,
        candidateId: blockchainCandidateId,
        name: dbCandidate.partyName,
        voteCount,
        status: dbCandidate.status
      });
    }

    res.json({
      electionTitle: election.title,
      electionId: blockchainElectionId,
      candidates
    });

  } catch (err) {
    console.error('Error in getElectionResultsByMongoId:', err);
    res.status(500).json({ error: err.message });
  }
};

const getMyVoteHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Find voter profile
    const voter = await Voter.findOne({ userId });

    if (!voter) {
      return res.status(404).json({
        message: "Voter profile not found"
      });
    }

    // 2️⃣ Get all votes of this voter
    const votes = await Vote.find({ voterId: voter._id })
      .populate("electionId", "title level electionStart electionEnd")
      .populate("candidateId", "partyName manifesto")
      .sort({ createdAt: -1 });

    // 3️⃣ Format response
    const history = votes.map(v => ({
      voteId: v._id,
      election: {
        id: v.electionId?._id,
        title: v.electionId?.title,
        level: v.electionId?.level,
        start: v.electionId?.electionStart,
        end: v.electionId?.electionEnd
      },
      candidate: {
        name: v.candidateId?.partyName || "Unknown Candidate",
        manifesto: v.candidateId?.manifesto
      },
      blockchainTx: v.blockchainTx,
      votedAt: v.createdAt
    }));

    res.json({
      totalVotes: history.length,
      history
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  castVote,
  checkIfVoted,
  getVoterVote,
  checkWalletVerification,
  getElectionResults,
  getAllCompletedResults,
  getElectionResultsByMongoId,
  getMyVoteHistory,
};
