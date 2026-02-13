const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  createElection,
  getAllElections
} = require("../controllers/electionController");

// ADMIN → create election
router.post("/", protect, createElection);

// ALL → view elections
router.get("/", protect, getAllElections);

module.exports = router;
