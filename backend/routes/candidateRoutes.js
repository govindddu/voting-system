const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  registerCandidate,
  approveCandidate
} = require("../controllers/candidateController");

// CANDIDATE → register for election
router.post("/register", auth, registerCandidate);

// ADMIN → approve / reject candidate
router.put("/:id/approve", auth, approveCandidate);

module.exports = router;
