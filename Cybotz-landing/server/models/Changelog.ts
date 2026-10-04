import mongoose from "mongoose";

export interface IChangelog {
  _id?: string;
  action: string;
  category: "Reservations" | "Blogs" | "Curriculums" | "Changelogs" | "System";
  description: string;
  username: string;
  role: string;
  details?: Record<string, any>;
  createdAt: Date;
}

const ChangelogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Reservations", "Blogs", "Curriculums", "Changelogs", "System"],
      default: "System",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      // 1 Year TTL Index (365 days = 31,536,000 seconds)
      expires: 31536000,
    },
  },
  { timestamps: true }
);

ChangelogSchema.index({ createdAt: -1 });

export const Changelog = mongoose.model("Changelog", ChangelogSchema);
