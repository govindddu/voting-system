const express = require("express");
const {
  registerUser,
  loginUser,
  sendEmailOtp,
  verifyEmailOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.post("/send-email-otp", sendEmailOtp);
router.post("/verify-email-otp", verifyEmailOtp);

router.post("/forgot-password/request-otp", requestPasswordResetOtp);
router.post("/forgot-password/reset", resetPasswordWithOtp);

module.exports = router;
