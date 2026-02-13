const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { encrypt, decrypt } = require("../utils/encryption");
const Otp = require("../models/Otp");
const { sendOtpEmail } = require("../utils/mailer");

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

const createOrUpdateOtp = async ({ email, purpose }) => {
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await Otp.findOneAndUpdate(
    { email, purpose },
    { email, purpose, otpHash, expiresAt, attempts: 0 },
    { upsert: true, new: true, runValidators: true }
  );

  return { otp, expiresAt };
};

/**
 * @desc Register new user
 * @route POST /api/auth/register
 */
const registerUser = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, role } = req.body;

    if (!fullName || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email: normalizedEmail,
      phoneNumber,
      passwordHash,
      role,
      emailVerified: false
    });

    const { otp } = await createOrUpdateOtp({
      email: normalizedEmail,
      purpose: "EMAIL_VERIFICATION"
    });

    const emailResult = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      purpose: "EMAIL_VERIFICATION"
    });

    return res.status(201).json({
      message: emailResult.success 
        ? "User registered successfully. OTP sent to email."
        : "User registered successfully. Check server console for OTP (email not configured).",
      userId: user._id,
      email: normalizedEmail,
      emailSent: emailResult.success
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


/**
 * @desc Login user
 * @route POST /api/auth/login
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        privateKeyEncrypted: user.privateKeyEncrypted,
        emailVerified: user.emailVerified
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendEmailOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const { otp } = await createOrUpdateOtp({
      email: normalizedEmail,
      purpose: "EMAIL_VERIFICATION"
    });

    const emailResult = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      purpose: "EMAIL_VERIFICATION"
    });

    return res.json({ 
      message: emailResult.success 
        ? "OTP sent to email" 
        : "OTP generated. Check server console (email not configured).",
      emailSent: emailResult.success
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const verifyEmailOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ message: "Email and otp are required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.json({ message: "Email already verified" });
    }

    const record = await Otp.findOne({
      email: normalizedEmail,
      purpose: "EMAIL_VERIFICATION"
    });

    if (!record) {
      return res.status(400).json({ message: "OTP not found. Please request a new OTP." });
    }

    if (new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many attempts. Please request a new OTP." });
    }

    const ok = hashOtp(otp) === record.otpHash;
    if (!ok) {
      await Otp.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.emailVerified = true;
    await user.save();
    await Otp.deleteOne({ _id: record._id });

    return res.json({ message: "Email verified successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const requestPasswordResetOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { otp } = await createOrUpdateOtp({
      email: normalizedEmail,
      purpose: "PASSWORD_RESET"
    });

    const emailResult = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      purpose: "PASSWORD_RESET"
    });

    return res.json({ 
      message: emailResult.success 
        ? "OTP sent to email" 
        : "OTP generated. Check server console (email not configured).",
      emailSent: emailResult.success
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resetPasswordWithOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (!normalizedEmail || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, otp and newPassword are required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const record = await Otp.findOne({
      email: normalizedEmail,
      purpose: "PASSWORD_RESET"
    });

    if (!record) {
      return res.status(400).json({ message: "OTP not found. Please request a new OTP." });
    }

    if (new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many attempts. Please request a new OTP." });
    }

    const ok = hashOtp(otp) === record.otpHash;
    if (!ok) {
      await Otp.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    await Otp.deleteOne({ _id: record._id });

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  sendEmailOtp,
  verifyEmailOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp
};
