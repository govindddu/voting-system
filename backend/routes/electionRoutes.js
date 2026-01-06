const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  createElection,
  getAllElections
} = require("../controllers/electionController");

// ADMIN → create election
router.post("/", auth, createElection);

// ALL → view elections
router.get("/", auth, getAllElections);

module.exports = router;
