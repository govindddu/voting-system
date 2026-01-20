const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const uploadDocument = require("../middleware/uploadMiddleware"); // <-- your multer file

const {
  registerCandidate,
  approveCandidate
} = require("../controllers/candidateController");

// ✅ CANDIDATE → register for election (multipart/form-data)
router.post(
  "/register",
  auth,
  uploadDocument.fields([
    { name: "documentFile", maxCount: 1 },
    { name: "symbol", maxCount: 1 }
  ]),
  registerCandidate
);

// ADMIN → approve / reject candidate
router.put("/:id/approve", auth, approveCandidate);

module.exports = router;
