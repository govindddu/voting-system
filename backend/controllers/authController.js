const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { encrypt, decrypt } = require("../utils/encryption");

/**
 * @desc Register new user
 * @route POST /api/auth/register
 */
const registerUser = async (req, res) => {
  try {




    const { fullName, email, phoneNumber, password, role, privateKey } = req.body;
    console.log("Register request received:", { fullName, email, phoneNumber, role, hasPrivateKey: !!privateKey });

    // Validate required fields
    if (!fullName || !email || !phoneNumber || !password || !role || !privateKey) {
      console.log("Missing required fields");
      return res.status(400).json({ message: "All fields including private key are required" });
    }

    // Validate private key format (should be 64 hex characters for secp256k1)
    const privateKeyRegex = /^[a-fA-F0-9]{64}$/;
    if (!privateKeyRegex.test(privateKey)) {
      return res.status(400).json({ message: "Invalid private key format. Must be 64 hexadecimal characters." });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("User already exists:", email);
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Encrypt private key
    const encryptedPrivateKey = encrypt(privateKey);

    const user = await User.create({
      fullName,
      email,
      phoneNumber,
      passwordHash,
      role,
      privateKey: encryptedPrivateKey,
      privateKeyEncrypted: true
    });

    console.log("User registered successfully:", user._id);
    res.status(201).json({
      message: "User registered successfully",
      userId: user._id,
    });
  } catch (error) {
    console.error("Register error:", error.message, error.stack);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Login user
 * @route POST /api/auth/login
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
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
        privateKeyEncrypted: user.privateKeyEncrypted
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
