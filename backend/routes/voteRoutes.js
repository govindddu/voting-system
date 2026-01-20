const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const { castVote } = require("../controllers/voteController");

router.post("/cast", auth, castVote);

module.exports = router;
