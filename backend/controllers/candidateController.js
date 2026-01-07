const Candidate = require("../models/Candidate");
const Election = require("../models/Election");

const registerCandidate = async (req, res) => {
  try {
    if (req.user.role !== "CANDIDATE") {
      return res.status(403).json({ message: "Only candidates can register" });
    }

    const election = await Election.findById(req.body.electionId);

    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    if (new Date() > election.candidateRegistrationLastDate) {
      return res.status(400).json({ message: "Registration closed" });
    }

    const existing = await Candidate.findOne({
      userId: req.user.id,
      electionId: election._id
    });

    if (existing) {
      return res.status(400).json({ message: "Already registered" });
    }

    const candidate = await Candidate.create({
      userId: req.user.id,
      electionId: election._id,
      partyName: req.body.partyName,
      manifesto: req.body.manifesto,
      symbol: req.file?.filename
    });

    res.status(201).json({
      message: "Candidate registered successfully",
      candidate
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { registerCandidate };


const approveCandidate = async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Access denied" });
  }

  const candidate = await Candidate.findById(req.params.id);

  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }

  candidate.status = req.body.status; // APPROVED / REJECTED
  candidate.remarks = req.body.remarks;

  await candidate.save();

  res.json({ message: "Candidate status updated", candidate });
};

module.exports = {
  registerCandidate,
  approveCandidate
};