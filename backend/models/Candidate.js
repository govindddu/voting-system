const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Election",
    required: true
  },

  partyName: {
    type: String,
    required: true
  },

  manifesto: {
    type: String
  },

  symbol: {
    type: String // party symbol image
  },

  documentType: {
    type: String,
    enum: ["AADHAR", "PAN", "VOTER"],
    required: true
  },

  documentFile: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["PENDING", "VERIFIED", "REJECTED"],
    default: "PENDING"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Candidate", candidateSchema);
