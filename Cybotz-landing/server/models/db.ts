import "dotenv/config";
import mongoose from "mongoose";

// Disable buffering so queries fail fast with clear error instead of timing out after 10000ms
mongoose.set("bufferCommands", false);

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cybotz";

let isConnecting = false;

let hasLoggedWarning = false;

export async function connectDB(silent = false): Promise<boolean> {
  if (mongoose.connection.readyState === 1) {
    return true;
  }
  if (isConnecting) {
    // Wait briefly if another call is currently connecting
    let checks = 0;
    while (isConnecting && checks < 20) {
      await new Promise((r) => setTimeout(r, 250));
      if ((mongoose.connection.readyState as number) === 1) return true;
      checks++;
    }
  }

  isConnecting = true;
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 });
    console.log("[DB] MongoDB connected successfully!");
    isConnecting = false;
    hasLoggedWarning = false;
    return true;
  } catch (error: any) {
    isConnecting = false;
    if (!silent && !hasLoggedWarning) {
      console.warn("\n[DB WARNING] Could not connect to MongoDB at " + MONGO_URI);
      console.warn("[DB WARNING] Start MongoDB to enable database features (auth, bookings, blogs).");
      console.warn("[DB WARNING] Master user (Superman) can log in offline.\n");
      hasLoggedWarning = true;
    }
    return false;
  }
}
