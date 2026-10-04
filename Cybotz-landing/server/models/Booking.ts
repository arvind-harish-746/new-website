import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true, // Prevents double booking on the same date
  },
  time: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  schoolName: {
    type: String,
    default: "",
  },
  additionalInfo: {
    type: String,
    default: "",
  },
}, { timestamps: true });

export const Booking = mongoose.model("Booking", BookingSchema);
