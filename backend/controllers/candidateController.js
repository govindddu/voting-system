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

    if (!user.privateKey || !user.privateKeyEncrypted) {
      return res.status(400).json({ message: "Private key not found. Please ensure your account was registered properly." });
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
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status, remarks } = req.body;

    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }

    // if (!["APPROVED", "REJECTED"].includes(status)) {
    //   return res.status(400).json({ message: "Invalid status value" });
    // }

    const candidate = await Candidate.findById(req.params.id).populate("electionId");

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Update MongoDB status
    candidate.status = status;
    candidate.remarks = remarks;

    // ✅ If APPROVED → Add to blockchain
    if (status === "VERIFIED") {
      // Election must contain blockchain electionId (uint)
      if (!candidate.electionId.electionId) {
        return res.status(400).json({
          message: "Election blockchain electionId missing in DB"
        });
      }

      const blockchainElectionId = Number(candidate.electionId.electionId);

      // Add candidate name to blockchain
      const tx = await contract.addCandidate(
        blockchainElectionId,
        candidate.partyName, // or use user fullName if you want
        { gasLimit: 500000 }
      );

      await tx.wait();

      // Get new candidateId from blockchain
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

module.exports = {
  registerCandidate,
  approveCandidate
};
