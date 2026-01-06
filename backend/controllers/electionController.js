const Election = require("../models/Election");

const createElection = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const election = await Election.create({
      ...req.body,
      createdBy: req.user.id
    });

    res.status(201).json({
      message: "Election created successfully",
      election
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllElections = async (req, res) => {
  const elections = await Election.find().sort({ createdAt: -1 });
  res.json(elections);
};

module.exports = {
  createElection,
  getAllElections
};
