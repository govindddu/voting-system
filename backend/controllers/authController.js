const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Voter = require("../models/Voter");

const registerUser = async (req, res) => {
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

        // check user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // create user
        const user = await User.create({
            fullName,
            email,
            phoneNumber,
            passwordHash,
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
                documentFile,
                status: "PENDING"
            });
        }

        res.status(201).json({
            message: "Registration successful",
            userId: user._id
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser };
