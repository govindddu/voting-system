const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const uploadDocument = require("../middleware/uploadMiddleware");

const {
    createVoterProfile,
    getMyVoterProfile,
    verifyVoter
} = require("../controllers/voterController");

// CREATE voter (POST)
router.post(
    "/create",
    protect,
    uploadDocument.single("documentFile"),
    createVoterProfile
);





router.get("/me", protect, getMyVoterProfile);


// ADMIN → verify voter
router.put("/:id/verify", protect, verifyVoter);

module.exports = router;
