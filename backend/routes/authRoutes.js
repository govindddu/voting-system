const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Voter = require("../models/Voter");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
    try {
        const {
            fullName,
            email,
            phoneNumber,
            password,
            role,
            dateOfBirth,
            gender,
            address,
            state,
            district,
            pincode,
            documentType,
            documentFile
        } = req.body;

        // check existing user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // create user
        const user = await User.create({
            fullName,
            email,
            phoneNumber,
            passwordHash: hashedPassword,
            role
        });

        // create voter only if role is VOTER
        if (role === "VOTER") {
            await Voter.create({
                userId: user._id,
                voterId: "VOT" + Date.now(),
                dateOfBirth,
                gender,
                address,
                state,
                district,
                pincode,
                documentType,
                documentFile
            });
        }

        res.status(201).json({ message: "Registration successful" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
