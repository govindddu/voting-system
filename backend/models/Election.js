const mongoose = require("mongoose");

const electionSchema = new mongoose.Schema({
  electionId: {
    type: Number,
    unique: true
  },

  // ✅ Blockchain tx hash for creation
  blockchainTx: {
    type: String
  },
  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String
  },

  level: {
    type: String,
    enum: ["DISTRICT", "STATE", "NATIONAL"],
    required: true
  },

  electionStart: {
    type: Date,
    required: true
  },

  electionEnd: {
    type: Date,
    required: true
  },

  candidateRegistrationLastDate: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ["DRAFT", "UPCOMING", "ONGOING", "COMPLETED"],
    default: "DRAFT"
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Election", electionSchema);
