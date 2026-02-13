const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const { castVote, checkIfVoted, getVoterVote, checkWalletVerification, getElectionResults, getAllCompletedResults, getElectionResultsByMongoId ,getMyVoteHistory} = require("../controllers/voteController");


// VOTER → cast vote
router.post("/cast", protect, castVote);

// VOTER → check if already voted
router.post("/check-voted", protect, checkIfVoted);

// VOTER → check if wallet is verified on blockchain
router.get("/check-wallet", protect, checkWalletVerification);

// Get results for completed elections
router.get("/results/completed", getAllCompletedResults);

// Get results for specific election by MongoDB ID
router.get("/results/election/:electionMongoId", getElectionResultsByMongoId);

// Get results by blockchain election ID
router.get("/results/:electionMongoId", getElectionResults);

// VOTER → get voting history (must be before /:electionMongoId to avoid conflict)
router.get("/history/me", protect, getMyVoteHistory);

// VOTER → get their vote in an election (must be last to avoid conflict)
router.get("/:electionMongoId", protect, getVoterVote);


module.exports = router;
