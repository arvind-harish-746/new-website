import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
  otp: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "editor", "viewer"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // 10 minutes TTL
  },
});

export const Otp = mongoose.model("Otp", OtpSchema);
