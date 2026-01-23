const contract = require("../Blockchain/contract.js");
const Election = require("../models/Election.js");
const Candidate = require("../models/Candidate.js");
const Vote = require("../models/vote.js");
const Voter = require("../models/Voter.js");
const User = require("../models/User.js");
const { decrypt } = require("../utils/encryption.js");

const { ethers } = require("ethers");

const castVote = async (req, res) => {
  try {
    const userId = req.user.id;

    const { electionMongoId, candidateMongoId } = req.body;

    if (!electionMongoId || !candidateMongoId) {
      return res.status(400).json({
        message: "electionMongoId and candidateMongoId are required"
      });
    }

    // 1️⃣ Check voter profile
    const voter = await Voter.findOne({ userId });
    if (!voter) {
      return res.status(404).json({ message: "Voter profile not found" });
    }

    // ✅ Check private key encryption
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.privateKey || !user.privateKeyEncrypted) {
      return res.status(400).json({ message: "Private key not found. Please ensure your account was registered properly." });
    }

    // Decrypt private key
    let decryptedPrivateKey;
    try {
      decryptedPrivateKey = decrypt(user.privateKey);
    } catch (err) {
      return res.status(500).json({ message: "Failed to decrypt private key" });
    }

    // 2️⃣ Only VERIFIED voter can vote
    if (voter.status !== "VERIFIED") {
      return res.status(403).json({ message: "Voter is not verified" });
    }

    // 3️⃣ Check election in DB
    const election = await Election.findById(electionMongoId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    if (!election.electionId) {
      return res.status(400).json({ message: "Election blockchain id missing" });
    }

    // 4️⃣ Check candidate in DB
    const candidate = await Candidate.findById(candidateMongoId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!candidate.blockchainCandidateId) {
      return res.status(400).json({ message: "Candidate blockchain id missing" });
    }

    // Candidate must belong to same election
    if (String(candidate.electionId) !== String(election._id)) {
      return res.status(400).json({ message: "Candidate not in this election" });
    }

    // 5️⃣ Prevent double vote in MongoDB (extra safety)
    const alreadyVoted = await Vote.findOne({
      voterId: voter._id,
      electionId: election._id
    });

    if (alreadyVoted) {
      return res.status(400).json({ message: "Already voted (DB check)" });
    }

    // 6️⃣ Create voter signer using private key
    const provider = contract.runner.provider;
    const voterSigner = new ethers.Wallet(decryptedPrivateKey, provider);

    const voterContract = contract.connect(voterSigner);

    // 7️⃣ Call blockchain vote()
    const tx = await voterContract.vote(
      Number(election.electionId),
      Number(candidate.blockchainCandidateId),
      { gasLimit: 500000 }
    );

    await tx.wait();

    // 8️⃣ Save tx hash in DB
    const vote = await Vote.create({
      voterId: voter._id,
      electionId: election._id,
      candidateId: candidate._id,
      blockchainTx: tx.hash
    });

    return res.status(201).json({
      message: "Vote cast successfully",
      txHash: tx.hash,
      vote
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  castVote
};
