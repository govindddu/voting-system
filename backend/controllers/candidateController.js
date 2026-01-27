const Candidate = require("../models/Candidate.js");
const Election = require("../models/Election.js");
const contract = require("../Blockchain/contract.js");
const User = require("../models/User.js");
const { decrypt } = require("../utils/encryption.js");

// ==============================
// CANDIDATE → Register Candidate
// ==============================
const registerCandidate = async (req, res) => {
  try {
    // ✅ Allow USER / VOTER to apply for candidate
    if (!["USER", "VOTER", "CANDIDATE"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { electionId, partyName, manifesto, documentType } = req.body;

    if (!electionId || !partyName || !documentType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 1️⃣ Check election
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    // 2️⃣ Check registration deadline
    if (new Date() > new Date(election.candidateRegistrationLastDate)) {
      return res.status(400).json({ message: "Registration closed" });
    }

    // 3️⃣ Check already registered
    const existing = await Candidate.findOne({
      userId: req.user.id,
      electionId: election._id
    });

    if (existing) {
      return res.status(400).json({ message: "Already registered" });
    }

    // ✅ Check private key encryption
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    

    // 4️⃣ File validation
    if (!req.files || !req.files.documentFile) {
      return res.status(400).json({ message: "Document file is required" });
    }

    // ✅ 5️⃣ Upgrade role to CANDIDATE if not already

    if (user.role !== "CANDIDATE") {
      user.role = "CANDIDATE";
      await user.save();
    }

    // 6️⃣ Create Candidate profile
    const candidate = await Candidate.create({
      userId: req.user.id,
      electionId: election._id,
      partyName,
      manifesto,
      symbol: req.files.symbol ? req.files.symbol[0].filename : null,
      documentType: documentType.trim(),
      documentFile: req.files.documentFile[0].filename,
      status: "PENDING"
    });

    return res.status(201).json({
      message: "Candidate registered successfully (role updated to CANDIDATE)",
      candidate
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
// =====================================
// ADMIN → Approve Candidate (Blockchain)
// =====================================
const approveCandidate = async (req, res) => {
  try {
    // 🔐 Admin check
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status, remarks } = req.body;

    // ✅ Candidate schema enum: PENDING, VERIFIED, REJECTED
    if (!["VERIFIED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const candidate = await Candidate.findById(req.params.id).populate("electionId");

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Update MongoDB status
    candidate.status = status;
    candidate.remarks = remarks || "";

    // ✅ If VERIFIED → Add candidate to blockchain
    if (status === "VERIFIED") {
      // electionId.electionId = blockchain election id (uint)
      if (!candidate.electionId?.electionId) {
        return res.status(400).json({
          message: "Election blockchain electionId missing in DB"
        });
      }

      const blockchainElectionId = Number(candidate.electionId.electionId);

      // add candidate name on blockchain
      const tx = await contract.addCandidate(
        blockchainElectionId,
        candidate.partyName,
        { gasLimit: 500000 }
      );

      await tx.wait();

      // get candidateId from blockchain
      const newCandidateId = await contract.candidateCount(blockchainElectionId);

      candidate.blockchainCandidateId = Number(newCandidateId);
      candidate.blockchainTx = tx.hash;
    }

    await candidate.save();

    return res.json({
      message: "Candidate status updated successfully",
      candidate
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getCandidatesByElection = async (req, res) => {
  try {
    const electionMongoId = req.params.electionMongoId;

    const candidates = await Candidate.find({
      electionId: electionMongoId,
      status: "VERIFIED"
    });

    return res.json({ candidates });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};



module.exports = {
  registerCandidate,
  approveCandidate,
  getCandidatesByElection
};
