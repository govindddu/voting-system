
const path = require("path");
const contract = require("../Blockchain/contract.js");
const Election = require("../models/Election.js");
const Candidate = require("../models/Candidate.js");
const Voter = require("../models/Voter.js");



// CREATE VOTER
const createVoterProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: "Document required" });
    }

    const {
      voterId,
      dateOfBirth,
      gender,
      address,
      state,
      district,
      pincode,
      documentType,
    } = req.body;

    // basic validation for required fields (except voterId, auto-generated)
    if (!dateOfBirth || !gender || !address || !state || !district || !pincode || !documentType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await Voter.findOne({ userId });
    if (existing) {
      return res.status(400).json({ message: "Voter already exists" });
    }

    // auto-generate voterId if not provided
    let finalVoterId = voterId;
    if (!finalVoterId) {
      let unique = false;
      // attempt a few times to avoid collisions
      for (let i = 0; i < 5 && !unique; i++) {
        const candidateId = `VOT-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
        const clash = await Voter.findOne({ voterId: candidateId });
        if (!clash) {
          finalVoterId = candidateId;
          unique = true;
        }
      }
      if (!finalVoterId) {
        return res.status(500).json({ message: "Could not generate voter ID" });
      }
    }

    const voter = await Voter.create({
      userId,
      voterId: finalVoterId,
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

    res.status(201).json({ message: "Voter created", voter });
  } catch (err) {
    console.error("CREATE_VOTER_ERROR", err);
    res.status(500).json({ message: err.message || "Internal server error" });
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

    return res.json({
      message: `Voter ${status.toLowerCase()} successfully`,
      voter
    });

  } catch (err) {
    console.error("VERIFY_VOTER_ERROR", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};

module.exports = {
  createVoterProfile,
  getMyVoterProfile,
  updateMyVoterProfile,
  getAllVoters,
  verifyVoter
};

