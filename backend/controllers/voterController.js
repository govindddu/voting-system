const Voter = require("../models/Voter");

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

module.exports = {
    createVoterProfile,
    getMyVoterProfile,
};
