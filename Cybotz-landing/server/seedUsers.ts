import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { User } from "./models/User.js";
import { connectDB } from "./models/db.js";
import "dotenv/config";

const users = [
  { username: "Superman", password: "Ww!32NjjF@1509", role: "master" },
] as const;

async function seed() {
  const connected = await connectDB();
  if (!connected) {
    console.log("[AUTH] Seeding skipped because MongoDB is not running.");
    process.exit(0);
  }
  for (const u of users) {
    const existingUser = await User.findOne({ username: u.username });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      await User.create({
        username: u.username,
        password: hashedPassword,
        role: u.role
      });
      console.log(`[AUTH] Seeded user: ${u.username} (${u.role})`);
    } else {
      console.log(`[AUTH] User already exists: ${u.username}`);
    }
  }
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding error:", err);
  process.exit(1);
});
