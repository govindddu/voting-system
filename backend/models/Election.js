const mongoose = require("mongoose");

const electionSchema = new mongoose.Schema({
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

  district: {
    type: String,
    required: function () {
      return this.level === "DISTRICT";
    }
  },

  state: {
    type: String,
    required: function () {
      return this.level !== "NATIONAL";
    }
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
    enum: ["UPCOMING", "ONGOING", "COMPLETED"],
    default: "UPCOMING"
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
