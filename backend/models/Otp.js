const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    purpose: {
      type: String,
      enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET"],
      required: true,
      index: true
    },
    otpHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    attempts: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

otpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model("Otp", otpSchema);
