const Candidate = require("../models/Candidate");
const Election = require("../models/Election");


const registerCandidate = async (req, res) => {
  try {
    // 1️⃣ Role check
    if (req.user.role !== "CANDIDATE") {
      return res.status(403).json({ message: "Only candidates can register" });
    }

    // 2️⃣ Election check
    const election = await Election.findById(req.body.electionId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    // 3️⃣ Registration deadline check
    if (new Date() > election.candidateRegistrationLastDate) {
      return res.status(400).json({ message: "Registration closed" });
    }

    // 4️⃣ Already registered check
    const existing = await Candidate.findOne({
      userId: req.user.id,
      electionId: election._id
    });

    if (existing) {
      return res.status(400).json({ message: "Already registered" });
    }

    // 5️⃣ Document validation
    if (!req.files || !req.files.documentFile) {
      return res.status(400).json({ message: "Document file is required" });
    }

    if (!req.body.documentType) {
      return res.status(400).json({ message: "Document type is required" });
    }

    // 6️⃣ Create candidate
    const candidate = await Candidate.create({
      userId: req.user.id,
      electionId: election._id,
      partyName: req.body.partyName,
      manifesto: req.body.manifesto,

      // optional party symbol
      symbol: req.files.symbol ? req.files.symbol[0].filename : null,

      // required document fields
      documentType: req.body.documentType,
      documentFile: req.files.documentFile[0].filename,

      status: "PENDING"
    });

    res.status(201).json({
      message: "Candidate registered successfully",
      candidate
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


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