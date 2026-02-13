const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const uploadDocument = require("../middleware/uploadMiddleware");

const {
    createVoterProfile,
    getMyVoterProfile,
    updateMyVoterProfile,
    getAllVoters,
    verifyVoter,
    getAvailableElections
} = require("../controllers/voterController");

// PUBLIC → get all available elections (voter dashboard)
router.get("/elections/available", getAvailableElections);

// CREATE voter (POST)
router.post(
    "/create",
    protect,
    uploadDocument.single("documentFile"),
    createVoterProfile
);

// ADMIN → list all voters
router.get("/", protect, getAllVoters);

// Auth user → get own voter profile
router.get("/me", protect, getMyVoterProfile);

// Auth user → update own voter profile
router.put("/update", protect, uploadDocument.single("documentFile"), updateMyVoterProfile);

// ADMIN → verify voter
router.put("/:id/verify", protect, verifyVoter);

module.exports = router;
