const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const { castVote, checkIfVoted, getVoterVote, checkWalletVerification } = require("../controllers/voteController");

// VOTER → cast vote
router.post("/cast", auth, castVote);

// VOTER → check if already voted
router.post("/check-voted", auth, checkIfVoted);

// VOTER → check if wallet is verified on blockchain
router.get("/check-wallet", auth, checkWalletVerification);

// VOTER → get their vote in an election
router.get("/:electionMongoId", auth, getVoterVote);

module.exports = router;
