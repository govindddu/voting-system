const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  phoneNumber: {
    type: String,
    required: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["ADMIN", "VOTER", "CANDIDATE"],
    required: true
  },

  privateKey: {
    type: String,
    trim: true,
    sparse: true
  },

  privateKeyEncrypted: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);
