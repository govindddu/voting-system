const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const uploadDocument = require("../middleware/uploadMiddleware"); // <-- your multer file

const {
  registerCandidate,
  approveCandidate,
  getCandidatesByElection,
  getAllCandidates,
  getMyCandidateRegistrations
} = require("../controllers/candidateController");

// ✅ CANDIDATE → register for election (multipart/form-data)
router.post(
  "/register",
  protect,
  uploadDocument.fields([
    { name: "documentFile", maxCount: 1 },
    { name: "symbol", maxCount: 1 }
  ]),
  registerCandidate
);

// USER → get my candidate registrations
router.get("/my-registrations", protect, getMyCandidateRegistrations);

// ADMIN → list all candidates (for verification)
router.get("/", protect, getAllCandidates);

// ADMIN → approve / reject candidate
router.put("/:id/approve", protect, approveCandidate);
router.get("/election/:electionMongoId", protect, getCandidatesByElection);


module.exports = router;
