import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["master", "admin", "editor", "viewer", "student"],
    default: "viewer",
  },
  phone: {
    type: String,
    default: "",
    trim: true,
  },
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export const User = mongoose.model("User", UserSchema);
