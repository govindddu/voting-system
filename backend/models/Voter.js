const mongoose = require("mongoose");

const voterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  voterId: {
    type: String,
    required: true,
    unique: true
  },

  dateOfBirth: {
    type: Date,
    required: true
  },

  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    required: true
  },

  address: {
    type: String,
    required: true
  },

  state: {
    type: String,
    required: true
  },

  district: {
    type: String,
    required: true
  },

  pincode: {
    type: String,
    required: true
  },

  documentType: {
    type: String,
    enum: ["AADHAR", "PAN", "VOTER"],
    required: true
  },

  documentFile: {
    type: String, // file path or cloud URL
    required: true
  },

  status: {
    type: String,
    enum: ["PENDING", "VERIFIED", "REJECTED"],
    default: "PENDING"
  },

  remarks: {
    type: String // admin rejection reason
  }
});

module.exports = mongoose.model("Voter", voterSchema);
