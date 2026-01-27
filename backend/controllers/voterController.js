
const path = require("path");
const contract = require("../Blockchain/contract.js");
const Election = require("../models/Election.js");
const Candidate = require("../models/Candidate.js");
const Voter = require("../models/Voter.js");

// Generate a unique voterId when not provided by the client
const generateVoterId = async () => {
  const makeId = () => `VOTER-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  let candidate = makeId();
  // very low chance of collision; loop until unique
  while (await Voter.findOne({ voterId: candidate })) {
    candidate = makeId();
  }
  return candidate;
};


// CREATE VOTER
const createVoterProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: "Document required" });
    }

    const {
      voterId,
      walletAddress,
      dateOfBirth,
      gender,
      address,
      state,
      district,
      pincode,
      documentType,
    } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ message: "walletAddress is required" });
    }

    // basic wallet format check
    if (!walletAddress.startsWith("0x") || walletAddress.length !== 42) {
      return res.status(400).json({ message: "Invalid wallet address" });
    }

    const existing = await Voter.findOne({ userId });
    if (existing) {
      return res.status(400).json({ message: "Voter already exists" });
    }

    // prevent same wallet used by multiple voters
    const walletUsed = await Voter.findOne({ walletAddress });
    if (walletUsed) {
      return res.status(400).json({ message: "Wallet already linked with another voter" });
    }

    const newVoterId = voterId && voterId.trim() ? voterId.trim() : await generateVoterId();

    const voter = await Voter.create({
      userId,
      voterId: newVoterId,
      walletAddress,
      dateOfBirth,
      gender,
      address,
      state,
      district,
      pincode,
      documentType,
      documentFile: `${documentType}/${req.file.filename}`,
      status: "PENDING",
    });

    return res.status(201).json({ message: "Voter created", voter });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// GET ALL VOTERS (ADMIN)
const getAllVoters = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const voters = await Voter.find()
      .populate("userId", "fullName email phoneNumber role")
      .sort({ createdAt: -1 });

    // attach document URL path (frontend can prefix host)
    const result = voters.map((v) => {
      const fileName = v.documentFile ? path.basename(v.documentFile) : null;
      const folder = v.documentType || "docs";
      const documentUrl = fileName ? `/uploads/${folder}/${fileName}` : null;
      return {
        ...v.toObject(),
        documentUrl
      };
    });

    return res.json(result);
  } catch (err) {
    console.error("GET_ALL_VOTERS_ERROR", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// GET MY VOTER
const getMyVoterProfile = async (req, res) => {
  try {
    const voter = await Voter.findOne({ userId: req.user.id });

    if (!voter) {
      return res.status(404).json({ message: "Voter not found" });
    }

    res.json(voter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE MY VOTER PROFILE
const updateMyVoterProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const voter = await Voter.findOne({ userId });

    if (!voter) {
      return res.status(404).json({ message: "Voter profile not found" });
    }

    const {
      dateOfBirth,
      gender,
      address,
      state,
      district,
      pincode,
      documentType,
    } = req.body;

    // Update fields if provided
    if (dateOfBirth) voter.dateOfBirth = dateOfBirth;
    if (gender) voter.gender = gender;
    if (address) voter.address = address;
    if (state) voter.state = state;
    if (district) voter.district = district;
    if (pincode) voter.pincode = pincode;
    if (documentType) voter.documentType = documentType;

    // Update document file if new one is uploaded
    if (req.file) {
      voter.documentFile = `${documentType || voter.documentType}/${req.file.filename}`;
    }

    // Reset status to PENDING when profile is updated (requires re-verification)
    voter.status = "PENDING";
    voter.remarks = "";

    await voter.save();

    res.json({
      message: "Profile updated successfully. Your profile will be reviewed again.",
      voter
    });
  } catch (err) {
    console.error("UPDATE_VOTER_ERROR", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

const verifyVoter = async (req, res) => {
  try {
    // Only ADMIN
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status, remarks } = req.body;

    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }

    if (!["VERIFIED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const voter = await Voter.findById(req.params.id);

    if (!voter) {
      return res.status(404).json({ message: "Voter not found" });
    }

    voter.status = status;
    voter.remarks = remarks || "";

    await voter.save();
     if (status === "VERIFIED") {
      if (!voter.walletAddress) {
        return res.status(400).json({ message: "Voter walletAddress missing" });
      }

      const tx = await contract.verifyVoter(voter.walletAddress, { gasLimit: 200000 });
      await tx.wait();
    }

   
    return res.json({
      message: `Voter ${status.toLowerCase()} successfully`,
      voter
    });

  } catch (err) {
    console.error("VERIFY_VOTER_ERROR", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};

/**
 * @desc   Get Available Elections for Voter (Blockchain + MongoDB)
 * @route  GET /api/voters/available-elections
 * @access PUBLIC
 * @purpose Fetch all elections from blockchain, enrich with MongoDB details
 */
const getAvailableElections = async (req, res) => {
  try {
    console.log("Fetching available elections for voter dashboard...");

    // 1️⃣ Get total elections from blockchain
    const total = await contract.electionCount();
    console.log(`Total elections on blockchain: ${total}`);

    const elections = [];

    // 2️⃣ Loop through each blockchain election
    for (let i = 1; i <= Number(total); i++) {
      try {
        // Get blockchain data (source of truth)
        const chainElection = await contract.elections(i);

        // Get MongoDB details
        const dbElection = await Election.findOne({ electionId: i })
          .lean(); // Use lean for better performance

        // Only include elections that exist in both blockchain and MongoDB
        if (dbElection) {
          elections.push({
            electionId: i,
            blockchain: {
              startTime: Number(chainElection.startTime),
              endTime: Number(chainElection.endTime),
              isActive: chainElection.isActive
            },
            details: dbElection
          });
        }
      } catch (err) {
        console.warn(`Error fetching election ${i}:`, err.message);
        // Continue to next election if there's an error
        continue;
      }
    }

    console.log(`Returning ${elections.length} elections for voter dashboard`);

    return res.json({
      total: elections.length,
      elections,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("GET_AVAILABLE_ELECTIONS_ERROR", err);
    return res.status(500).json({
      message: err.message || "Could not fetch elections",
      elections: [],
      total: 0
    });
  }
};

module.exports = {
  createVoterProfile,
  getMyVoterProfile,
  updateMyVoterProfile,
  getAllVoters,
  verifyVoter,
  getAvailableElections
};

