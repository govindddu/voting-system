const contract = require("../Blockchain/contract.js");
const Election = require("../models/Election.js");

/**
 * @desc   Create Election (Blockchain + MongoDB)
 * @route  POST /api/elections
 * @access ADMIN
 */
const createElection = async (req, res) => {
  try {
    // 🔐 Admin check
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      title,
      description,
      level,
      electionStart,
      electionEnd,
      candidateRegistrationLastDate,
      category
    } = req.body;

    // Basic validation
    if (!title || !level || !electionStart || !electionEnd) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Convert Date → timestamp (seconds)
    const startTime = Math.floor(new Date(electionStart).getTime() / 1000);
    const endTime = Math.floor(new Date(electionEnd).getTime() / 1000);

    // 1️⃣ Store MINIMUM data on blockchain
    const tx = await contract.createElection(
      title,      // optional
      startTime,  // blockchain
      endTime,    // blockchain
      { gasLimit: 500000 }
    );
    await tx.wait();

    // 2️⃣ Get electionId from blockchain
    const electionId = await contract.electionCount();

    // 3️⃣ Store FULL data in MongoDB
    const election = await Election.create({
      electionId: Number(electionId),
      title,
      description,
      level,
      electionStart,
      electionEnd,
      candidateRegistrationLastDate,
      category,
      createdBy: req.user.id,
      blockchainTx: tx.hash,
      status: "UPCOMING"
    });

    res.status(201).json({
      message: "Election created successfully",
      election
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * @desc   Get All Elections (Blockchain + MongoDB)
 * @route  GET /api/elections
 * @access PUBLIC
 */
const getAllElections = async (req, res) => {
  try {
    // 1️⃣ Total elections from blockchain
    const total = await contract.electionCount();

    const elections = [];

    // 2️⃣ Loop blockchain elections
    for (let i = 1; i <= Number(total); i++) {

      // Blockchain data (truth)
      const chainElection = await contract.elections(i);

      // MongoDB data (details)
      const dbElection = await Election.findOne({ electionId: i })
        .populate("createdBy", "fullName email");

      // Skip elections without valid MongoDB data
      if (!dbElection || !dbElection.title) {
        continue;
      }

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

    res.json({
      total: elections.length,
      elections
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createElection,
  getAllElections
};
