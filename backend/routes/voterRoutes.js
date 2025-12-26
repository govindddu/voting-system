const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const uploadDocument = require("../middleware/uploadMiddleware");

const {
    createVoterProfile,
    getMyVoterProfile,
} = require("../controllers/voterController");

// CREATE voter (POST)
router.post(
    "/create",
    protect,
    uploadDocument.single("documentFile"),
    createVoterProfile
);


router.get("/me", protect, getMyVoterProfile);

module.exports = router;
