
import contract from "../Blockchain/contract.js";
import Election from "../models/Election.js";
import Candidate from "../models/Candidate.js";

import Voter from "../models/Voter.js";



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

        const existing = await Voter.findOne({ userId });
        if (existing) {
            return res.status(400).json({ message: "Voter already exists" });
        }

        const voter = await Voter.create({
            userId,
            voterId,
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
        res.status(500).json({ error: err.message });
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

export const verifyVoter = async (req, res) => {
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
    return res.status(500).json({ error: err.message });
  }
};

export {
  createVoterProfile,
  getMyVoterProfile,
 
};

