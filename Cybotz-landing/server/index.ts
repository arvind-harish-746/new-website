import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import mongoose from "mongoose";
import sharp from "sharp";

import { connectDB } from "./models/db.js";
import { User } from "./models/User.js";
import { Booking } from "./models/Booking.js";
import { Blog } from "./models/Blog.js";
import { Curriculum } from "./models/Curriculum.js";
import { Changelog } from "./models/Changelog.js";
import { Otp } from "./models/Otp.js";
import { Gallery } from "./models/Gallery.js";

import { enqueueWhatsAppMessage } from "./queue.js";
import { generateClientGoogleCalendarUrl, syncHostGoogleCalendar } from "./gcal.js";
import { verifyJwt, requireMaster, AuthRequest } from "./middleware/auth.js";
import { containsProfanity, sanitizeCommentText } from "./profanity.js";
import { parseStudentFile, syncStudents } from "./studentSync.js";
import { requireTurnstile } from "./turnstile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveDataFilePath(filename: string): string | null {
  const candidatePaths = [
    path.join(__dirname, "data", filename),
    path.join(__dirname, "..", "server", "data", filename),
    path.join(process.cwd(), "server", "data", filename),
    path.join(process.cwd(), "dist", "data", filename),
    path.join(process.cwd(), "Cybotz-landing", "server", "data", filename),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const JWT_SECRET = process.env.JWT_SECRET || "fallback_super_secret_key_2026";

function isTimeWithinWorkingHours(timeStr: string): boolean {
  if (!timeStr) return false;
  let hours = 0;
  let minutes = 0;

  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    hours = parseInt(match12[1], 10);
    minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  } else {
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      hours = parseInt(match24[1], 10);
      minutes = parseInt(match24[2], 10);
    } else {
      return false;
    }
  }

  const totalMinutes = hours * 60 + minutes;
  const startMinutes = 9 * 60; // 9:00 AM (540)
  const endMinutes = 16 * 60;  // 4:00 PM (960)

  return totalMinutes >= startMinutes && totalMinutes <= endMinutes;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function sanitizeString(input: unknown, maxLength = 500): string {
  if (typeof input !== "string") return "";
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, maxLength);
}
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

const defaultUsers = [
  { username: "Superman", password: "Ww!32NjjF@1509", role: "master" },
] as const;

async function recordChangelog(entry: {
  username?: string;
  role?: string;
  action: string;
  category: "Reservations" | "Blogs" | "Curriculums" | "Changelogs" | "System";
  description: string;
  details?: Record<string, any>;
}) {
  // master actions are NEVER stored in changelogs!
  if (entry.role === "master") {
    console.log(`[Changelog] Bypass logging for master action: ${entry.action}`);
    return;
  }

  try {
    await Changelog.create({
      action: entry.action,
      category: entry.category,
      description: entry.description,
      username: entry.username || "System",
      role: entry.role || "admin",
      details: entry.details || {},
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[Changelog] Failed to record log entry:", err);
  }
}

async function autoSeedUsers() {
  try {
    for (const u of defaultUsers) {
      const exists = await User.findOne({ username: u.username });
      if (!exists) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await User.create({
          username: u.username,
          password: hashedPassword,
          role: u.role
        });
        console.log(`[AUTH] Seeded user: ${u.username} (${u.role})`);
      } else if (exists.role !== u.role) {
        exists.role = u.role;
        await exists.save();
        console.log(`[AUTH] Updated role for user: ${u.username} -> ${u.role}`);
      }
    }

    // Clean up hardcoded legacy default users from MongoDB
    const legacyUsernames = ["Prasanna MG", "Renzz", "viewer_demo", "Master_Ashoka", "Sai"];
    const cleanupResult = await User.deleteMany({ username: { $in: legacyUsernames } });
    if (cleanupResult.deletedCount > 0) {
      console.log(`[AUTH] Removed ${cleanupResult.deletedCount} legacy hardcoded user(s) from database.`);
    }
  } catch (err) {
    console.error("[AUTH] Error auto-seeding default users:", err);
  }
}

async function autoSeedContent() {
  try {
    const blogCount = await Blog.countDocuments();
    if (blogCount === 0) {
      try {
        const blogsPath = resolveDataFilePath("blogs.json");
        if (blogsPath) {
          const fallbackBlogs = JSON.parse(await fs.promises.readFile(blogsPath, "utf8"));
          for (const b of fallbackBlogs) {
            await Blog.create({
              title: b.title,
              tags: b.tags,
              summary: b.summary,
              content: b.content,
              author: b.author || "Prasanna",
              date: b.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              image: b.image || "",
            });
          }
          console.log(`[SEED] Auto-seeded ${fallbackBlogs.length} baseline blogs.`);
        }
      } catch (e) {
        console.warn("[SEED] Could not read blogs.json fallback for seeding:", e);
      }
    }

    const currCount = await Curriculum.countDocuments();
    if (currCount === 0) {
      try {
        const currsPath = resolveDataFilePath("curriculums.json");
        if (currsPath) {
          const fallbackCurrs = JSON.parse(await fs.promises.readFile(currsPath, "utf8"));
          for (const c of fallbackCurrs) {
            await Curriculum.create({
              title: c.title,
              level: c.level,
              duration: c.duration,
              targetAudience: c.targetAudience,
              summary: c.summary,
              modules: c.modules,
            });
          }
          console.log(`[SEED] Auto-seeded ${fallbackCurrs.length} baseline curriculums.`);
        }
      } catch (e) {
        console.warn("[SEED] Could not read curriculums.json fallback for seeding:", e);
      }
    }

    // Clean up legacy gallery records pointing to removed image files
    await Gallery.deleteMany({
      $or: [
        { src: { $regex: /lab-drone-chassis|workshop-drone-flight|circuit-soldering|oscilloscope|cleanroom|raspberry-pi/ } },
        { title: { $exists: true, $ne: "" } },
        { tag: { $exists: true, $ne: "" } }
      ]
    });

    const galleryCount = await Gallery.countDocuments();
    if (galleryCount === 0) {
      try {
        const galleryPath = resolveDataFilePath("gallery.json");
        if (galleryPath) {
          const fallbackGallery = JSON.parse(await fs.promises.readFile(galleryPath, "utf8"));
          for (const g of fallbackGallery) {
            await Gallery.create({
              page: g.page,
              src: g.src,
              alt: "",
              title: "",
              tag: "",
              addedBy: "System",
            });
          }
          console.log(`[SEED] Auto-seeded ${fallbackGallery.length} active gallery photos.`);
        }
      } catch (e) {
        console.warn("[SEED] Could not read gallery.json fallback for seeding:", e);
      }
    }
  } catch (err) {
    console.error("[SEED] Error in autoSeedContent:", err);
  }
}

async function startServer() {
  const dbConnected = await connectDB();
  if (dbConnected) {
    await autoSeedUsers();
    await autoSeedContent();
  } else {
    const retryInterval = setInterval(async () => {
      if (mongoose.connection.readyState === 1) {
        clearInterval(retryInterval);
        return;
      }
      const reconnected = await connectDB(true);
      if (reconnected) {
        await autoSeedUsers();
        await autoSeedContent();
        clearInterval(retryInterval);
      }
    }, 10000);
  }

  const app = express();
  const server = createServer(app);

  // Trust the first proxy (Nginx) so req.ip reflects the real client IP.
  // Critical for rate-limiting and IP-based security behind a reverse proxy.
  app.set("trust proxy", 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(compression({
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }));

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1",
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts. Please try again later." },
  });

  const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many booking requests. Please try again later." },
  });

  app.use("/api/", globalLimiter);

  // GET list of booked dates (Public)
  app.get("/api/booked-dates", async (_req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(200).json({ bookedDates: [] });
      }
      const bookings = await Booking.find({}, { date: 1, _id: 0 });
      const bookedDates = bookings.map(b => b.date);
      return res.status(200).json({ bookedDates });
    } catch (err: any) {
      return res.status(200).json({ bookedDates: [] });
    }
  });

  // POST Login Endpoint
  app.post("/api/admin/login", authLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const trimmedUser = String(username).trim();

    // 1. Instant Master User Check (always works regardless of MongoDB connection state)
    if (trimmedUser === "Superman" && password === "Ww!32NjjF@1509") {
      const token = jwt.sign(
        { userId: "master-id", username: "Superman", role: "master" },
        JWT_SECRET,
        { expiresIn: "12h" }
      );
      return res.status(200).json({
        success: true,
        token,
        role: "master",
        username: "Superman",
        offlineMode: mongoose.connection.readyState !== 1,
      });
    }

    // 2. Ensure Database Connection for other users
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database is offline. Start MongoDB to log in with standard credentials." });
    }

    try {
      const user = await User.findOne({ username: trimmedUser });
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      const token = jwt.sign(
        { userId: user._id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "12h" }
      );

      return res.status(200).json({ success: true, token, role: user.role, username: user.username });
    } catch (err) {
      console.error("[Login Error]", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  });

  // User Management Endpoints with WhatsApp OTP
  app.post("/api/admin/users/request-otp", async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: "Username, password, and role are required." });
    }

    const sanitizedUsername = sanitizeString(username, 30);
    if (sanitizedUsername.length < 2) {
      return res.status(400).json({ error: "Username must be at least 2 characters long." });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const allowedRoles = ["admin", "editor", "viewer"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role selected." });
    }

    try {
      const existingUser = await User.findOne({
        username: { $regex: new RegExp(`^${sanitizedUsername}$`, "i") }
      });
      if (existingUser) {
        return res.status(400).json({ error: `Username "${sanitizedUsername}" is already taken.` });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const passwordHash = await bcrypt.hash(password, 10);

      await Otp.deleteMany({ username: sanitizedUsername });

      await Otp.create({
        otp: otpCode,
        username: sanitizedUsername,
        passwordHash,
        role
      });

      const messageText = `*CYBOTZ PORTAL SECURITY OTP*\n--------------------------------\nAction: Create User\nUsername: ${sanitizedUsername}\nRole: ${role.toUpperCase()}\n--------------------------------\n*Verification Code: ${otpCode}*\n--------------------------------\n_Expires in 10 minutes. Enter this code on the portal to confirm account creation._`;

      await enqueueWhatsAppMessage({ messageText });

      return res.status(200).json({
        success: true,
        message: "Verification code sent to WhatsApp group chat."
      });
    } catch (err) {
      console.error("[OTP Request Error]", err);
      return res.status(500).json({ error: "Failed to process OTP request." });
    }
  });

  app.post("/api/admin/users/verify-otp", async (req, res) => {
    const { username, otp } = req.body;
    if (!username || !otp) {
      return res.status(400).json({ error: "Username and OTP are required." });
    }

    const sanitizedUsername = sanitizeString(username, 30);
    const sanitizedOtp = sanitizeString(otp, 10);

    try {
      const pending = await Otp.findOne({
        username: sanitizedUsername,
        otp: sanitizedOtp
      });

      if (!pending) {
        return res.status(400).json({ error: "Invalid or expired verification code." });
      }

      const existingUser = await User.findOne({ username: pending.username });
      if (existingUser) {
        await Otp.deleteMany({ username: pending.username });
        return res.status(400).json({ error: `Username "${pending.username}" already exists.` });
      }

      await User.create({
        username: pending.username,
        password: pending.passwordHash,
        role: pending.role
      });

      await Otp.deleteMany({ username: pending.username });

      await recordChangelog({
        username: pending.username,
        role: pending.role,
        action: "CREATE_USER",
        category: "System",
        description: `Created new user "${pending.username}" with role "${pending.role}" via WhatsApp OTP verification`,
        details: { username: pending.username, role: pending.role }
      });

      return res.status(200).json({
        success: true,
        message: `Account for "${pending.username}" created successfully! You can now log in.`,
        username: pending.username,
        role: pending.role
      });
    } catch (err) {
      console.error("[OTP Verify Error]", err);
      return res.status(500).json({ error: "Failed to verify code and create account." });
    }
  });

  app.get("/api/admin/users", verifyJwt(["master", "admin"]), async (_req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(200).json({ users: [] });
      }
      const users = await User.find(
        { role: { $ne: "master" }, username: { $ne: "Superman" } },
        { password: 0 }
      ).sort({ createdAt: -1 });
      return res.status(200).json({ users });
    } catch (err) {
      console.error("[Get Users Error]", err);
      return res.status(200).json({ users: [] });
    }
  });

  app.delete("/api/admin/users/:id", verifyJwt(["master", "admin"]), async (req: AuthRequest, res) => {
    try {
      const target = await User.findById(req.params.id);
      if (!target) {
        return res.status(404).json({ error: "User not found." });
      }

      if (target.role === "master" || target.username === "Superman") {
        return res.status(403).json({ error: "Cannot delete the master administrator account." });
      }

      await User.findByIdAndDelete(req.params.id);

      await recordChangelog({
        username: req.user?.username,
        role: req.user?.role,
        action: "DELETE_USER",
        category: "System",
        description: `Deleted user "${target.username}" (${target.role})`,
        details: { username: target.username, role: target.role }
      });

      const users = await User.find(
        { role: { $ne: "master" }, username: { $ne: "Superman" } },
        { password: 0 }
      ).sort({ createdAt: -1 });
      return res.status(200).json({ success: true, message: `User "${target.username}" deleted.`, users });
    } catch (err) {
      console.error("[Delete User Error]", err);
      return res.status(500).json({ error: "Failed to delete user." });
    }
  });

  // Protected Admin Endpoint: View bookings
  app.get("/api/admin/bookings", verifyJwt(["admin", "editor"]), async (_req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(200).json({
          bookedDates: [],
          reservations: [],
        });
      }
      const bookings = await Booking.find({});
      const bookedDates = bookings.map(b => b.date);
      return res.status(200).json({
        bookedDates,
        reservations: bookings,
      });
    } catch (err) {
      console.error("[Get Bookings Error]", err);
      return res.status(200).json({
        bookedDates: [],
        reservations: [],
      });
    }
  });

  // Protected Admin Endpoint: Cancel a reservation
  app.post("/api/admin/cancel-booking", verifyJwt(["admin"]), async (req: AuthRequest, res) => {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: "Date parameter is required." });

    const booking = await Booking.findOneAndDelete({ date });

    if (booking) {
      console.log(`[Admin] Removed reservation for date: "${date}"`);
      const canceledBy = req.user?.username || "administrator";

      // master actions are strictly untracked and do not trigger WhatsApp notifications
      if (req.user?.role !== "master") {
        const cancelMessageText = `*CYBOTZ Trial Session CANCELED*\n--------------------------------\n*Date:* ${booking.date}\n*Time:* ${booking.time}\n*Email:* ${booking.email}\n*Phone:* ${booking.phone}${booking.schoolName ? `\n*School:* ${booking.schoolName}` : ''}${booking.additionalInfo ? `\n*Notes:* ${booking.additionalInfo}` : ''}\n--------------------------------\n*Status:* This reservation has been canceled by ${canceledBy} and the date is now unblocked for new bookings.`;

        await enqueueWhatsAppMessage({
          messageText: cancelMessageText,
          phone: booking.phone
        });
      } else {
        console.log(`[WhatsApp] Suppressed cancellation WhatsApp message for master user: ${req.user?.username}`);
      }

      await recordChangelog({
        username: req.user?.username,
        role: req.user?.role,
        action: "CANCEL_RESERVATION",
        category: "Reservations",
        description: `Canceled reservation for date: ${booking.date} (${booking.schoolName || booking.email})`,
        details: { date: booking.date, time: booking.time, email: booking.email, phone: booking.phone }
      });
    }

    const remainingBookings = await Booking.find({});
    const bookedDates = remainingBookings.map(b => b.date);

    return res.status(200).json({
      success: true,
      message: `Reservation for "${date}" has been canceled.`,
      bookedDates,
      reservations: remainingBookings,
    });
  });

  // Protected Admin Endpoint: Edit time
  app.post("/api/admin/edit-booking-time", verifyJwt(["admin", "editor"]), async (req: AuthRequest, res) => {
    const { date, time } = req.body;
    if (!date || !time) return res.status(400).json({ error: "Date and new time parameters are required." });

    const sanitizedTime = sanitizeString(time, 20);
    const booking = await Booking.findOneAndUpdate({ date }, { time: sanitizedTime });

    if (!booking) {
      return res.status(404).json({ error: `No active reservation found for date "${date}".` });
    }

    // master actions are strictly untracked and do not trigger WhatsApp notifications
    if (req.user?.role !== "master") {
      const updatedBy = req.user?.username || "management";
      const rescheduleMessageText = `*CYBOTZ Trial Session RESCHEDULED*\n--------------------------------\n*Date:* ${booking.date}\n*Updated Time:* ${sanitizedTime} (Was: ${booking.time})\n*Email:* ${booking.email}\n*Phone:* ${booking.phone}${booking.schoolName ? `\n*School:* ${booking.schoolName}` : ''}${booking.additionalInfo ? `\n*Notes:* ${booking.additionalInfo}` : ''}\n--------------------------------\n*Status:* The trial session time has been updated by ${updatedBy}.`;

      await enqueueWhatsAppMessage({
        messageText: rescheduleMessageText,
        phone: booking.phone
      });
    } else {
      console.log(`[WhatsApp] Suppressed reschedule WhatsApp message for master user: ${req.user?.username}`);
    }

    await recordChangelog({
      username: req.user?.username,
      role: req.user?.role,
      action: "RESCHEDULE_SESSION",
      category: "Reservations",
      description: `Rescheduled reservation for "${booking.date}" to ${sanitizedTime} (Was: ${booking.time})`,
      details: { date: booking.date, oldTime: booking.time, newTime: sanitizedTime, email: booking.email }
    });

    const allBookings = await Booking.find({});
    return res.status(200).json({
      success: true,
      message: `Reservation time for "${date}" updated to ${sanitizedTime}!`,
      bookedDates: allBookings.map(b => b.date),
      reservations: allBookings,
    });
  });

  // Protected Admin Endpoint: Clear reservations for month
  app.post("/api/admin/clear-month", verifyJwt(["admin"]), async (req: AuthRequest, res) => {
    const { month } = req.body;
    if (!month) return res.status(400).json({ error: "Month parameter is required." });

    const monthTerm = month.trim();
    const result = await Booking.deleteMany({ date: { $regex: monthTerm, $options: "i" } });

    console.log(`[Admin] Cleared ${result.deletedCount} reservation(s) for month "${monthTerm}".`);

    await recordChangelog({
      username: req.user?.username,
      role: req.user?.role,
      action: "CLEAR_MONTH",
      category: "Reservations",
      description: `Cleared ${result.deletedCount} reservation(s) for month term "${monthTerm}"`,
      details: { month: monthTerm, deletedCount: result.deletedCount }
    });

    const allBookings = await Booking.find({});
    return res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} reservation(s) for ${monthTerm}!`,
      bookedDates: allBookings.map(b => b.date),
      reservations: allBookings,
    });
  });

  // Protected Admin Endpoint: Clear ALL
  app.post("/api/admin/clear-all", verifyJwt(["admin"]), async (req: AuthRequest, res) => {
    const count = await Booking.countDocuments({});
    await Booking.deleteMany({});
    console.log("[Admin] All reservations cleared by admin.");

    await recordChangelog({
      username: req.user?.username,
      role: req.user?.role,
      action: "CLEAR_ALL_RESERVATIONS",
      category: "Reservations",
      description: `Purged all ${count} reservation record(s) from database`,
      details: { deletedCount: count }
    });

    return res.status(200).json({
      success: true,
      message: "All reservations have been cleared successfully!",
      bookedDates: [],
      reservations: [],
    });
  });

  function sanitizeImagePath(img: unknown): string {
    if (typeof img !== "string") return "";
    let clean = img.replace(/\\/g, "/").replace(/^["']+|["']+$/g, "").trim();
    if (clean && !clean.startsWith("/") && !clean.startsWith("http")) {
      clean = "/" + clean;
    }
    return clean;
  }

  function formatBlogPayload(b: any) {
    const obj = b.toObject ? b.toObject({ virtuals: true }) : b;
    const idStr = (obj._id || obj.id || "").toString();
    return {
      ...obj,
      id: idStr,
      _id: idStr,
      image: sanitizeImagePath(obj.image),
      comments: Array.isArray(obj.comments)
        ? obj.comments.map((c: any) => ({
            _id: (c._id || c.id || "").toString(),
            id: (c._id || c.id || "").toString(),
            userId: (c.userId || "").toString(),
            username: c.username || "User",
            content: c.content || "",
            createdAt: c.createdAt || new Date(),
            updatedAt: c.updatedAt || c.createdAt || new Date(),
          }))
        : [],
    };
  }

  function formatCurriculumPayload(c: any) {
    const obj = c.toObject ? c.toObject({ virtuals: true }) : c;
    const idStr = (obj._id || obj.id || "").toString();
    return {
      ...obj,
      id: idStr,
      _id: idStr,
    };
  }

  // Public GET endpoints for Blogs and Curriculums
  app.get("/api/blogs", async (_req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        const blogs = await Blog.find({}).sort({ createdAt: -1 });
        if (blogs.length > 0) {
          return res.status(200).json({ blogs: blogs.map(formatBlogPayload) });
        }
      }
      const blogsPath = resolveDataFilePath("blogs.json");
      if (blogsPath) {
        const fallback = JSON.parse(await fs.promises.readFile(blogsPath, "utf8"));
        return res.status(200).json({ blogs: fallback.map(formatBlogPayload) });
      }
      return res.status(200).json({ blogs: [] });
    } catch {
      const blogsPath = resolveDataFilePath("blogs.json");
      if (blogsPath) {
        try {
          const fallback = JSON.parse(await fs.promises.readFile(blogsPath, "utf8"));
          return res.status(200).json({ blogs: fallback.map(formatBlogPayload) });
        } catch {
          return res.status(200).json({ blogs: [] });
        }
      }
      return res.status(200).json({ blogs: [] });
    }
  });

  // Dedicated single blog GET endpoint by ID, _id, or title slug
  app.get("/api/blogs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let blog = null;
      if (mongoose.connection.readyState === 1) {
        if (mongoose.Types.ObjectId.isValid(id)) {
          blog = await Blog.findById(id);
        }
        if (!blog) {
          blog = await Blog.findOne({
            $or: [
              { title: { $regex: new RegExp(`^${id}$`, "i") } },
              { title: { $regex: new RegExp(id.replace(/-/g, " "), "i") } }
            ]
          });
        }
      }
      if (!blog) {
        const blogsPath = resolveDataFilePath("blogs.json");
        if (blogsPath) {
          const fallback = JSON.parse(await fs.promises.readFile(blogsPath, "utf8"));
          blog = fallback.find((b: any) => b.id === id || b._id === id);
        }
      }
      if (!blog) {
        return res.status(404).json({ error: "Article not found" });
      }
      return res.status(200).json({ blog: formatBlogPayload(blog) });
    } catch {
      return res.status(404).json({ error: "Article not found" });
    }
  });

  app.get("/api/curriculums", async (_req, res) => {
    try {
      if (mongoose.connection.readyState === 1) {
        const curriculums = await Curriculum.find({}).sort({ createdAt: -1 });
        if (curriculums.length > 0) {
          return res.status(200).json({ curriculums: curriculums.map(formatCurriculumPayload) });
        }
      }
      const currsPath = resolveDataFilePath("curriculums.json");
      if (currsPath) {
        const fallback = JSON.parse(await fs.promises.readFile(currsPath, "utf8"));
        return res.status(200).json({ curriculums: fallback.map(formatCurriculumPayload) });
      }
      return res.status(200).json({ curriculums: [] });
    } catch {
      const currsPath = resolveDataFilePath("curriculums.json");
      if (currsPath) {
        try {
          const fallback = JSON.parse(await fs.promises.readFile(currsPath, "utf8"));
          return res.status(200).json({ curriculums: fallback.map(formatCurriculumPayload) });
        } catch {
          return res.status(200).json({ curriculums: [] });
        }
      }
      return res.status(200).json({ curriculums: [] });
    }
  });

  // Protected Admin Endpoints for Blogs
  app.post("/api/admin/add-blog", verifyJwt(["admin", "editor"]), async (req: AuthRequest, res) => {
    const title = sanitizeString(req.body.title, 200);
    const summary = sanitizeString(req.body.summary, 1000);
    const content = sanitizeString(req.body.content, 50000);
    const author = sanitizeString(req.body.author, 100) || req.user?.username || "Admin";
    const date = sanitizeString(req.body.date, 50) || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const image = sanitizeImagePath(req.body.image);
    const rawTags = req.body.tags;
    const tags: string[] = Array.isArray(rawTags)
      ? rawTags.map((t: unknown) => sanitizeString(t, 50)).filter(Boolean)
      : sanitizeString(rawTags, 200).split(",").map((t: string) => t.trim()).filter(Boolean);

    if (!title || !summary || !content) return res.status(400).json({ error: "Title, summary, and content are required." });

    const createdBlog = await Blog.create({ title, tags: tags.length > 0 ? tags : ["General"], summary, content, author, date, image });

    await recordChangelog({
      username: req.user?.username,
      role: req.user?.role,
      action: "ADD_BLOG",
      category: "Blogs",
      description: `Published new blog post: "${title}" by ${author}`,
      details: { id: createdBlog._id, title, author }
    });

    const blogs = await Blog.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, message: "Blog published successfully!", blogs: blogs.map(formatBlogPayload) });
  });

  app.post("/api/admin/edit-blog", verifyJwt(["admin", "editor"]), async (req: AuthRequest, res) => {
    const blogId = req.body.id || req.body._id;
    const { title, summary, content, author, tags: rawTags } = req.body;
    const image = sanitizeImagePath(req.body.image);
    if (!blogId) return res.status(400).json({ error: "Blog ID is required to edit." });

    const tags: string[] = Array.isArray(rawTags)
      ? rawTags.map((t: unknown) => sanitizeString(t, 50)).filter(Boolean)
      : sanitizeString(rawTags, 200).split(",").map((t: string) => t.trim()).filter(Boolean);

    await Blog.findByIdAndUpdate(blogId, { title, summary, content, author, image, tags });

    await recordChangelog({
      username: req.user?.username,
      role: req.user?.role,
      action: "EDIT_BLOG",
      category: "Blogs",
      description: `Updated blog article: "${title || blogId}"`,
      details: { id: blogId, title }
    });

    const blogs = await Blog.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, message: "Blog updated successfully!", blogs: blogs.map(formatBlogPayload) });
  });

  app.post("/api/admin/delete-blog", verifyJwt(["admin"]), async (req: AuthRequest, res) => {
    const blogId = req.body.id || req.body._id;
    if (!blogId) return res.status(400).json({ error: "Blog ID is required." });

    const blog = await Blog.findByIdAndDelete(blogId);

    await recordChangelog({
      username: req.user?.username,
      role: req.user?.role,
      action: "DELETE_BLOG",
      category: "Blogs",
      description: `Deleted blog article: "${blog?.title || blogId}"`,
      details: { id: blogId, title: blog?.title }
    });

    const blogs = await Blog.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, message: "Blog deleted successfully!", blogs: blogs.map(formatBlogPayload) });
  });

  // ----------------------------------------------------
  // Blog Comments Endpoints (Student & Editor Moderation)
  // ----------------------------------------------------

  // 1. GET: Retrieve comments for a blog article
  app.get("/api/blogs/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      let blog = null;
      if (mongoose.connection.readyState === 1) {
        if (mongoose.Types.ObjectId.isValid(id)) {
          blog = await Blog.findById(id);
        }
        if (!blog) {
          blog = await Blog.findOne({
            $or: [
              { title: { $regex: new RegExp(`^${id}$`, "i") } },
              { title: { $regex: new RegExp(id.replace(/-/g, " "), "i") } }
            ]
          });
        }
      }
      if (!blog) {
        return res.status(200).json({ comments: [] });
      }
      const formatted = formatBlogPayload(blog);
      return res.status(200).json({ comments: formatted.comments || [] });
    } catch {
      return res.status(200).json({ comments: [] });
    }
  });

  // 2. POST: Add a comment (Role: student, editor, admin, master)
  app.post("/api/blogs/:id/comments", requireTurnstile(), verifyJwt(["student", "editor", "admin", "master"]), async (req: AuthRequest, res) => {
    const { id } = req.params;
    const rawContent = req.body.content;

    if (!rawContent || typeof rawContent !== "string" || !rawContent.trim()) {
      return res.status(400).json({ error: "Comment text cannot be empty." });
    }

    const content = sanitizeCommentText(rawContent);

    // Strict Profanity & Cussword Filter
    if (containsProfanity(content)) {
      return res.status(400).json({
        error: "Your comment contains prohibited language or profanity. Please maintain a respectful learning environment."
      });
    }

    try {
      let blog = null;
      if (mongoose.connection.readyState === 1) {
        if (mongoose.Types.ObjectId.isValid(id)) {
          blog = await Blog.findById(id);
        }
        if (!blog) {
          blog = await Blog.findOne({
            $or: [
              { title: { $regex: new RegExp(`^${id}$`, "i") } },
              { title: { $regex: new RegExp(id.replace(/-/g, " "), "i") } }
            ]
          });
        }
      }

      if (!blog) {
        return res.status(404).json({ error: "Blog article not found." });
      }

      const newComment = {
        userId: req.user?.userId || "anonymous",
        username: req.user?.username || "Student",
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      blog.comments.push(newComment as any);
      await blog.save();

      const formatted = formatBlogPayload(blog);
      return res.status(201).json({
        success: true,
        message: "Comment posted successfully!",
        comments: formatted.comments,
      });
    } catch (err) {
      console.error("[Post Comment Error]", err);
      return res.status(500).json({ error: "Failed to post comment." });
    }
  });

  // 3. PUT: Edit comment (Author only or Master)
  app.put("/api/blogs/:id/comments/:commentId", verifyJwt(["student", "editor", "admin", "master"]), async (req: AuthRequest, res) => {
    const { id, commentId } = req.params;
    const rawContent = req.body.content;

    if (!rawContent || typeof rawContent !== "string" || !rawContent.trim()) {
      return res.status(400).json({ error: "Comment text cannot be empty." });
    }

    const content = sanitizeCommentText(rawContent);

    if (containsProfanity(content)) {
      return res.status(400).json({
        error: "Your comment contains prohibited language or profanity. Please maintain a respectful learning environment."
      });
    }

    try {
      const blog = await Blog.findById(id);
      if (!blog) return res.status(404).json({ error: "Blog article not found." });

      const comment = (blog.comments as any).id(commentId) || blog.comments.find((c: any) => c._id?.toString() === commentId);
      if (!comment) return res.status(404).json({ error: "Comment not found." });

      // Only the comment author or master can edit
      const isOwner = comment.userId === req.user?.userId || comment.username === req.user?.username;
      const isMaster = req.user?.role === "master";

      if (!isOwner && !isMaster) {
        return res.status(403).json({ error: "You can only edit your own comments." });
      }

      comment.content = content;
      comment.updatedAt = new Date();
      await blog.save();

      const formatted = formatBlogPayload(blog);
      return res.status(200).json({
        success: true,
        message: "Comment updated successfully!",
        comments: formatted.comments,
      });
    } catch (err) {
      console.error("[Edit Comment Error]", err);
      return res.status(500).json({ error: "Failed to update comment." });
    }
  });

  // 4. DELETE: Delete comment (Author, Editor, Admin, Master)
  app.delete("/api/blogs/:id/comments/:commentId", verifyJwt(["student", "editor", "admin", "master"]), async (req: AuthRequest, res) => {
    const { id, commentId } = req.params;

    try {
      const blog = await Blog.findById(id);
      if (!blog) return res.status(404).json({ error: "Blog article not found." });

      const comment = (blog.comments as any).id(commentId) || blog.comments.find((c: any) => c._id?.toString() === commentId);
      if (!comment) return res.status(404).json({ error: "Comment not found." });

      const isOwner = comment.userId === req.user?.userId || comment.username === req.user?.username;
      const canModerate = ["editor", "admin", "master"].includes(req.user?.role || "");

      if (!isOwner && !canModerate) {
        return res.status(403).json({ error: "Insufficient permissions to delete this comment." });
      }

      blog.comments = blog.comments.filter((c: any) => c._id?.toString() !== commentId && c.id !== commentId) as any;
      await blog.save();

      const formatted = formatBlogPayload(blog);
      return res.status(200).json({
        success: true,
        message: "Comment deleted.",
        comments: formatted.comments,
      });
    } catch (err) {
      console.error("[Delete Comment Error]", err);
      return res.status(500).json({ error: "Failed to delete comment." });
    }
  });

  // ----------------------------------------------------
  // Student First-Time Setup & Password Reset (WhatsApp OTP)
  // ----------------------------------------------------
  app.post("/api/student/request-reset-otp", async (req, res) => {
    const { identifier } = req.body;
    if (!identifier || typeof identifier !== "string") {
      return res.status(400).json({ error: "Username or registered phone number is required." });
    }

    const trimmed = identifier.trim();
    const normalizedPhone = trimmed.replace(/[^\d]/g, "");

    try {
      let user = await User.findOne({
        $or: [
          { username: { $regex: new RegExp(`^${trimmed}$`, "i") } },
          { phone: normalizedPhone.length >= 10 ? { $regex: new RegExp(normalizedPhone.slice(-10)) } : "NOMATCH" }
        ]
      });

      if (!user) {
        return res.status(404).json({ error: "No account found with this username or phone number." });
      }

      const userPhone = user.phone || (normalizedPhone.length >= 10 ? normalizedPhone : "");
      if (!userPhone) {
        return res.status(400).json({ error: "No phone number is registered on this account to receive OTP." });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      await Otp.deleteMany({ username: user.username });
      await Otp.create({
        otp: otpCode,
        username: user.username,
        role: user.role || "student",
      });

      const messageText = `CYBOTZ Student Portal\n--------------------------------\nAction: Password Setup / Reset\nAccount: ${user.username}\n--------------------------------\nVerification Code: ${otpCode}\n--------------------------------\nEnter this code on the portal to set your new password. Valid for 10 minutes.`;

      await enqueueWhatsAppMessage({
        phone: userPhone,
        messageText,
      });

      return res.status(200).json({
        success: true,
        message: "Verification code sent to your registered WhatsApp number."
      });
    } catch (err) {
      console.error("[Student OTP Request Error]", err);
      return res.status(500).json({ error: "Failed to send verification code." });
    }
  });

  app.post("/api/student/verify-reset-otp", async (req, res) => {
    const { identifier, otp, newPassword } = req.body;
    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ error: "Identifier, OTP code, and new password are required." });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const trimmed = String(identifier).trim();
    const normalizedPhone = trimmed.replace(/[^\d]/g, "");

    try {
      const user = await User.findOne({
        $or: [
          { username: { $regex: new RegExp(`^${trimmed}$`, "i") } },
          { phone: normalizedPhone.length >= 10 ? { $regex: new RegExp(normalizedPhone.slice(-10)) } : "NOMATCH" }
        ]
      });

      if (!user) {
        return res.status(404).json({ error: "Student account not found." });
      }

      const record = await Otp.findOne({
        username: user.username,
        otp: String(otp).trim(),
      });

      if (!record) {
        return res.status(400).json({ error: "Invalid or expired verification code." });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.mustChangePassword = false;
      await user.save();

      await Otp.deleteMany({ username: user.username });

      const token = jwt.sign(
        { userId: user._id, username: user.username, role: user.role || "student" },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      return res.status(200).json({
        success: true,
        message: "Password updated successfully!",
        token,
        role: user.role || "student",
        username: user.username,
      });
    } catch (err) {
      console.error("[Student OTP Verify Error]", err);
      return res.status(500).json({ error: "Failed to update password." });
    }
  });

  // ----------------------------------------------------
  // Admin Automated Excel Sync Endpoint
  // ----------------------------------------------------
  app.post("/api/admin/students/sync", verifyJwt(["admin", "master"]), async (_req: AuthRequest, res) => {
    try {
      const candidateFiles = [
        resolveDataFilePath("students.xlsx"),
        resolveDataFilePath("students.csv"),
        path.join(__dirname, "data", "students.xlsx"),
        path.join(__dirname, "data", "students.csv"),
        path.join(process.cwd(), "students.xlsx"),
        path.join(process.cwd(), "students.csv"),
      ].filter(Boolean) as string[];

      let targetFile = candidateFiles.find(p => fs.existsSync(p));
      if (!targetFile) {
        return res.status(404).json({
          error: "No students.xlsx or students.csv found in server/data directory. Place your student file in server/data/ to sync."
        });
      }

      const rows = await parseStudentFile(targetFile);
      if (rows.length === 0) {
        return res.status(400).json({ error: "Student file contains no valid rows with Name and Phone." });
      }

      const result = await syncStudents(rows);
      return res.status(200).json({
        success: true,
        message: `Synced ${result.created} new student(s). ${result.skipped} existing student(s) preserved.`,
        result
      });
    } catch (err: any) {
      console.error("[Student Sync Error]", err);
      return res.status(500).json({ error: err?.message || "Failed to synchronize student accounts." });
    }
  });

  // ----------------------------------------------------
  // Dedicated Student Portal API Endpoints
  // ----------------------------------------------------
  app.get("/api/student/dashboard", verifyJwt(["student", "editor", "admin", "master"]), async (req: AuthRequest, res) => {
    try {
      const username = req.user?.username || "";
      const userId = req.user?.userId || "";

      const safeIsoDate = (val: any): string => {
        if (!val) return new Date().toISOString();
        const d = new Date(val);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      };

      // 1. Fetch user's comments across all blogs with replies & redirect targets
      let userComments: Array<{
        blogId: string;
        blogTitle: string;
        blogDate: string;
        commentId: string;
        content: string;
        createdAt: string;
        updatedAt?: string;
        replies: Array<{
          commentId: string;
          username: string;
          content: string;
          createdAt: string;
        }>;
      }> = [];

      let blogs: any[] = [];
      if (mongoose.connection.readyState === 1) {
        try {
          blogs = await Blog.find({});
        } catch {
          blogs = [];
        }
      }
      if (!blogs || blogs.length === 0) {
        const blogsPath = resolveDataFilePath("blogs.json");
        if (blogsPath && fs.existsSync(blogsPath)) {
          try {
            blogs = JSON.parse(await fs.promises.readFile(blogsPath, "utf8"));
          } catch {
            blogs = [];
          }
        }
      }

      for (const b of (blogs || [])) {
        const blogId = (b._id || b.id || "").toString();
        const comments = Array.isArray(b.comments) ? b.comments : [];

        // Find user comments in this blog
        const myComments = comments.filter(
          (c: any) =>
            (c.username && c.username.toLowerCase() === username.toLowerCase()) ||
            (c.userId && c.userId === userId)
        );

        for (const mc of myComments) {
          const myCommentId = (mc._id || mc.id || "").toString();
          const myCommentDate = new Date(mc.createdAt || 0).getTime();

          // Detect replies or subsequent interactions on the same blog discussion
          const otherReplies = comments
            .filter((c: any) => {
              const cId = (c._id || c.id || "").toString();
              const isDifferentUser =
                c.username?.toLowerCase() !== username.toLowerCase() && c.userId !== userId;
              const isAfter = new Date(c.createdAt || 0).getTime() >= myCommentDate;
              return isDifferentUser && isAfter && cId !== myCommentId;
            })
            .map((c: any) => ({
              commentId: (c._id || c.id || "").toString(),
              username: c.username || "Peer Student",
              content: c.content || "",
              createdAt: safeIsoDate(c.createdAt),
            }));

          userComments.push({
            blogId,
            blogTitle: b.title || "Blog Article",
            blogDate: b.date || "",
            commentId: myCommentId,
            content: mc.content || "",
            createdAt: safeIsoDate(mc.createdAt),
            updatedAt: mc.updatedAt ? safeIsoDate(mc.updatedAt) : undefined,
            replies: otherReplies,
          });
        }
      }

      userComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // 2. Fetch Curriculum Status & The Next Move
      let curriculums: any[] = [];
      if (mongoose.connection.readyState === 1) {
        try {
          curriculums = await Curriculum.find({}).sort({ createdAt: -1 });
        } catch {
          curriculums = [];
        }
      }
      if (!curriculums || curriculums.length === 0) {
        const currsPath = resolveDataFilePath("curriculums.json");
        if (currsPath && fs.existsSync(currsPath)) {
          try {
            curriculums = JSON.parse(await fs.promises.readFile(currsPath, "utf8"));
          } catch {
            curriculums = [];
          }
        }
      }

      const curriculumTracks = (curriculums || []).map((c: any, index: number) => {
        const totalModules = Array.isArray(c.modules) ? c.modules.length : 4;
        const currentModuleIndex = Math.min(index + 1, Math.max(totalModules - 1, 0));
        const activeModule = c.modules?.[currentModuleIndex] || c.modules?.[0] || {
          title: "Core Electronics & Microcontrollers",
          desc: "Hardware assembly, pin configuration, and sensor interfacing."
        };
        const nextModule = c.modules?.[currentModuleIndex + 1] || {
          title: "Autonomous Mission Flight Testing",
          desc: "Flight controller tuning, telemetry diagnostics, and field testing."
        };

        return {
          id: (c._id || c.id || `track-${index}`).toString(),
          title: c.title || `Curriculum Track ${index + 1}`,
          level: c.level || "Beginner",
          duration: c.duration || "3 Months",
          targetAudience: c.targetAudience,
          summary: c.summary,
          progressPercent: Math.min(30 + index * 25, 80),
          currentModule: {
            step: currentModuleIndex + 1,
            totalSteps: totalModules,
            title: activeModule.title,
            desc: activeModule.desc,
            status: "In Progress"
          },
          nextMove: {
            title: nextModule.title,
            desc: nextModule.desc,
            actionRequired: "Review flight controller circuit schematics and complete pre-lab checklist.",
            targetMilestoneDate: "Upcoming Lab Session",
            recommendedReadingSlug: "raspberry-pi-drone"
          }
        };
      });

      return res.status(200).json({
        success: true,
        username,
        role: req.user?.role || "student",
        comments: userComments,
        curriculumTracks,
      });
    } catch (err) {
      console.error("[Student Dashboard Error]", err);
      return res.status(500).json({ error: "Failed to load student dashboard data." });
    }
  });

  // Protected Admin Endpoints for Curriculums
  app.post("/api/admin/add-curriculum", verifyJwt(["admin", "editor"]), async (req: AuthRequest, res) => {
    const { title, level, duration, targetAudience, summary, modules: rawModules } = req.body;
    if (!title || !level || !duration || !summary) return res.status(400).json({ error: "Title, level, duration, and summary are required." });

    const modules = Array.isArray(rawModules)
      ? rawModules.map((m: any) => ({ title: sanitizeString(m?.title, 200), desc: sanitizeString(m?.desc, 1000) })).filter(m => m.title && m.desc)
      : [];

    const createdCurr = await Curriculum.create({ title, level, duration, targetAudience, summary, modules });

    await recordChangelog({
      username: req.user?.username,
      role: req.user?.role,
      action: "ADD_CURRICULUM",
      category: "Curriculums",
      description: `Created curriculum: "${title}" (${level} - ${duration})`,
      details: { id: createdCurr._id, title, level, duration }
    });

    const curriculums = await Curriculum.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, message: "Curriculum added successfully!", curriculums: curriculums.map(formatCurriculumPayload) });
  });

  app.post("/api/admin/delete-curriculum", verifyJwt(["admin"]), async (req: AuthRequest, res) => {
    const currId = req.body.id || req.body._id;
    if (!currId) return res.status(400).json({ error: "Curriculum ID is required." });

    const curr = await Curriculum.findByIdAndDelete(currId);

    await recordChangelog({
      username: req.user?.username,
      role: req.user?.role,
      action: "DELETE_CURRICULUM",
      category: "Curriculums",
      description: `Deleted curriculum module: "${curr?.title || currId}"`,
      details: { id: currId, title: curr?.title }
    });

    const curriculums = await Curriculum.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, message: "Curriculum deleted successfully!", curriculums: curriculums.map(formatCurriculumPayload) });
  });

  // ----------------------------------------------------
  // Gallery Endpoints for Infinite Drag Scroll (Labs & Workshops)
  // ----------------------------------------------------

  // Public GET: Retrieve gallery photos
  app.get("/api/gallery", async (req, res) => {
    const page = req.query.page as string | undefined;
    try {
      if (mongoose.connection.readyState === 1) {
        const query = page ? { page } : {};
        const dbPhotos = await Gallery.find(query).sort({ createdAt: -1 });
        if (dbPhotos.length > 0) {
          return res.status(200).json({ photos: dbPhotos });
        }
      }

      const galleryPath = resolveDataFilePath("gallery.json");
      if (galleryPath) {
        const fallback = JSON.parse(await fs.promises.readFile(galleryPath, "utf8"));
        const filtered = page ? fallback.filter((p: any) => p.page === page) : fallback;
        return res.status(200).json({ photos: filtered });
      }

      return res.status(200).json({ photos: [] });
    } catch (err) {
      console.error("[Gallery GET Error]", err);
      const galleryPath = resolveDataFilePath("gallery.json");
      if (galleryPath) {
        try {
          const fallback = JSON.parse(await fs.promises.readFile(galleryPath, "utf8"));
          const filtered = page ? fallback.filter((p: any) => p.page === page) : fallback;
          return res.status(200).json({ photos: filtered });
        } catch {}
      }
      return res.status(200).json({ photos: [] });
    }
  });

  // Protected: Add photo (Roles: master, admin, editor)
  app.post("/api/admin/gallery/add", verifyJwt(["admin", "editor"]), async (req: AuthRequest, res) => {
    const page = req.body.page === "workshops" ? "workshops" : "labs";
    const src = sanitizeImagePath(req.body.src);
    const title = sanitizeString(req.body.title, 200);
    const alt = sanitizeString(req.body.alt, 500) || title;
    const tag = sanitizeString(req.body.tag, 100);

    if (!src) {
      return res.status(400).json({ error: "Photo image source (src) is required." });
    }

    let createdItem: any = null;
    if (mongoose.connection.readyState === 1) {
      createdItem = await Gallery.create({
        page,
        src,
        title: title || `Cybotz ${page} photo`,
        alt: alt || title,
        tag: tag || (page === "labs" ? "Labs" : "Workshops"),
        addedBy: req.user?.username || "Editor",
      });
    }

    // Sync with gallery.json fallback
    const galleryPath = resolveDataFilePath("gallery.json") || path.join(__dirname, "data", "gallery.json");
    try {
      let existing: any[] = [];
      if (fs.existsSync(galleryPath)) {
        existing = JSON.parse(await fs.promises.readFile(galleryPath, "utf8"));
      }
      const newEntry = {
        id: createdItem?._id?.toString() || `photo-${Date.now()}`,
        page,
        src,
        title: title || `Cybotz ${page} photo`,
        alt: alt || title,
        tag: tag || (page === "labs" ? "Labs" : "Workshops"),
        addedBy: req.user?.username || "Editor",
        createdAt: new Date().toISOString(),
      };
      existing.unshift(newEntry);
      await fs.promises.writeFile(galleryPath, JSON.stringify(existing, null, 2), "utf8");
    } catch (e) {
      console.warn("[Gallery] Could not sync gallery.json:", e);
    }

    await recordChangelog({
      username: req.user?.username,
      role: req.user?.role,
      action: "ADD_GALLERY_PHOTO",
      category: "System",
      description: `Added new photo to ${page} gallery: "${title || src}"`,
      details: { page, src, title }
    });

    let photos: any[] = [];
    if (mongoose.connection.readyState === 1) {
      photos = await Gallery.find({ page }).sort({ createdAt: -1 });
    } else if (fs.existsSync(galleryPath)) {
      const all = JSON.parse(await fs.promises.readFile(galleryPath, "utf8"));
      photos = all.filter((p: any) => p.page === page);
    }

    return res.status(200).json({
      success: true,
      message: `Photo added to ${page} gallery successfully!`,
      photos,
    });
  });

  // Protected: Delete photo (Roles: master, admin, editor)
  app.post("/api/admin/gallery/delete", verifyJwt(["admin", "editor"]), async (req: AuthRequest, res) => {
    const photoId = req.body.id || req.body._id;
    const page = req.body.page;
    if (!photoId) return res.status(400).json({ error: "Photo ID is required to delete." });

    let deletedPhoto: any = null;
    if (mongoose.connection.readyState === 1) {
      deletedPhoto = await Gallery.findByIdAndDelete(photoId);
    }

    const galleryPath = resolveDataFilePath("gallery.json");
    if (galleryPath && fs.existsSync(galleryPath)) {
      try {
        const existing = JSON.parse(await fs.promises.readFile(galleryPath, "utf8"));
        const filtered = existing.filter((p: any) => p.id !== photoId && p._id !== photoId);
        await fs.promises.writeFile(galleryPath, JSON.stringify(filtered, null, 2), "utf8");
      } catch {}
    }

    await recordChangelog({
      username: req.user?.username,
      role: req.user?.role,
      action: "DELETE_GALLERY_PHOTO",
      category: "System",
      description: `Removed photo from gallery: "${deletedPhoto?.title || photoId}"`,
      details: { id: photoId }
    });

    let photos: any[] = [];
    if (mongoose.connection.readyState === 1 && page) {
      photos = await Gallery.find({ page }).sort({ createdAt: -1 });
    } else if (galleryPath && fs.existsSync(galleryPath)) {
      const all = JSON.parse(await fs.promises.readFile(galleryPath, "utf8"));
      photos = page ? all.filter((p: any) => p.page === page) : all;
    }

    return res.status(200).json({
      success: true,
      message: "Photo deleted from gallery successfully.",
      photos,
    });
  });

  // Protected: Upload image file directly to client public folder (Roles: master, admin, editor)
  app.post("/api/admin/gallery/upload", verifyJwt(["admin", "editor"]), async (req: AuthRequest, res) => {
    const { page, dataUrl, filename } = req.body;
    const targetFolder = page === "workshops" ? "workshops" : "labs";

    if (!dataUrl || !dataUrl.includes(";base64,")) {
      return res.status(400).json({ error: "Valid base64 data URL is required." });
    }

    try {
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid base64 image data payload." });
      }

      let ext = matches[1].split("/")[1] || "png";
      if (ext === "jpeg") ext = "jpg";
      if (ext.includes("+")) ext = ext.split("+")[0];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      const baseName = filename ? sanitizeString(filename, 50).replace(/[^a-zA-Z0-9_-]/g, "_") : `upload_${Date.now()}`;
      const safeFilename = `${baseName}.${ext}`;
      const webpFilename = `${baseName}.webp`;

      // Server-Side Auto-Compression using Sharp
      const MAX_DIMENSION = 1600;
      let sharpPipeline = sharp(buffer);
      const meta = await sharpPipeline.metadata();

      const shouldResize =
        (meta.width && meta.width > MAX_DIMENSION) ||
        (meta.height && meta.height > MAX_DIMENSION);

      const getOptimizedPipeline = () => {
        let p = sharp(buffer);
        if (shouldResize) {
          p = p.resize({
            width: meta.width && meta.width >= (meta.height || 0) ? MAX_DIMENSION : undefined,
            height: meta.height && meta.height > (meta.width || 0) ? MAX_DIMENSION : undefined,
            fit: "inside",
            withoutEnlargement: true,
          });
        }
        return p;
      };

      // 1. Generate optimized WebP buffer
      const webpBuffer = await getOptimizedPipeline()
        .webp({ quality: 82, effort: 6 })
        .toBuffer();

      // 2. Generate optimized original format buffer
      let optimizedOriginalBuffer = buffer;
      try {
        if (ext === "png") {
          optimizedOriginalBuffer = await getOptimizedPipeline()
            .png({ quality: 80, palette: true, compressionLevel: 9, effort: 6 })
            .toBuffer();
        } else if (ext === "jpg" || ext === "jpeg") {
          optimizedOriginalBuffer = await getOptimizedPipeline()
            .jpeg({ quality: 82, mozjpeg: true })
            .toBuffer();
        } else if (ext === "webp") {
          optimizedOriginalBuffer = webpBuffer;
        }
      } catch (err) {
        console.warn("[Upload] Format optimization warning, using webp buffer:", err);
      }

      // Write files to public folder targets
      const candidateTargets = [
        path.resolve(process.cwd(), "client", "public", "images", targetFolder, safeFilename),
        path.resolve(process.cwd(), "Cybotz-landing", "client", "public", "images", targetFolder, safeFilename),
        path.resolve(process.cwd(), "dist", "public", "images", targetFolder, safeFilename),
        path.resolve(__dirname, "..", "client", "public", "images", targetFolder, safeFilename),
      ];

      for (const t of candidateTargets) {
        try {
          fs.mkdirSync(path.dirname(t), { recursive: true });
          fs.writeFileSync(t, optimizedOriginalBuffer);

          // Also save companion .webp if different
          if (ext !== "webp") {
            const webpTarget = path.join(path.dirname(t), webpFilename);
            fs.writeFileSync(webpTarget, webpBuffer);
          }
        } catch {}
      }

      const originalKb = (buffer.length / 1024).toFixed(1);
      const compressedKb = (optimizedOriginalBuffer.length / 1024).toFixed(1);
      const webpKb = (webpBuffer.length / 1024).toFixed(1);
      console.log(`[GALLERY UPLOAD] Compressed ${safeFilename}: ${originalKb} KB -> ${compressedKb} KB (WebP: ${webpKb} KB)`);

      const publicSrc = `/images/${targetFolder}/${safeFilename}`;
      return res.status(200).json({
        success: true,
        src: publicSrc,
        webpSrc: `/images/${targetFolder}/${webpFilename}`,
        originalKb,
        compressedKb,
        webpKb,
        message: `Image successfully compressed and uploaded to /images/${targetFolder}/${safeFilename}!`,
      });
    } catch (err) {
      console.error("[Gallery Upload Error]", err);
      return res.status(500).json({ error: "Failed to upload image file." });
    }
  });

  // ----------------------------------------------------
  // Protected Changelog Endpoints (1-Year Auto-Retention)
  // ----------------------------------------------------

  app.get("/api/admin/changelogs", verifyJwt(["admin", "editor", "master"]), async (req: AuthRequest, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(200).json({
          success: true,
          changelogs: [],
          userRole: req.user?.role,
          canEdit: req.user?.role === "master",
        });
      }

      const { category, search, limit = "100" } = req.query;
      const query: any = {};

      if (category && category !== "All") {
        query.category = category;
      }

      if (search && typeof search === "string" && search.trim()) {
        const searchRegex = { $regex: search.trim(), $options: "i" };
        query.$or = [
          { description: searchRegex },
          { username: searchRegex },
          { action: searchRegex },
        ];
      }

      const parsedLimit = Math.min(Math.max(parseInt(limit as string, 10) || 100, 1), 500);
      const changelogs = await Changelog.find(query).sort({ createdAt: -1 }).limit(parsedLimit);

      return res.status(200).json({
        success: true,
        changelogs,
        userRole: req.user?.role,
        canEdit: req.user?.role === "master",
      });
    } catch (err) {
      console.error("[Changelogs GET Error]", err);
      return res.status(200).json({
        success: true,
        changelogs: [],
        userRole: req.user?.role,
        canEdit: req.user?.role === "master",
      });
    }
  });

  // 2. PUT: ONLY master can edit logs
  app.put("/api/admin/changelogs/:id", requireMaster(), async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { action, category, description, username } = req.body;

    if (!description && !action) {
      return res.status(400).json({ error: "Description or action is required." });
    }

    try {
      const updateData: any = {};
      if (action) updateData.action = sanitizeString(action, 100);
      if (category) updateData.category = category;
      if (description) updateData.description = sanitizeString(description, 1000);
      if (username) updateData.username = sanitizeString(username, 100);

      const updatedLog = await Changelog.findByIdAndUpdate(id, updateData, { new: true });
      if (!updatedLog) {
        return res.status(404).json({ error: "Changelog entry not found." });
      }

      const changelogs = await Changelog.find({}).sort({ createdAt: -1 }).limit(100);
      return res.status(200).json({
        success: true,
        message: "Changelog entry updated successfully.",
        changelogs,
      });
    } catch (err) {
      console.error("[Changelog PUT Error]", err);
      return res.status(500).json({ error: "Failed to update changelog." });
    }
  });

  // 3. DELETE: ONLY master can delete individual logs
  app.delete("/api/admin/changelogs/:id", requireMaster(), async (req: AuthRequest, res) => {
    const { id } = req.params;
    try {
      const deleted = await Changelog.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ error: "Changelog entry not found." });
      }

      const changelogs = await Changelog.find({}).sort({ createdAt: -1 }).limit(100);
      return res.status(200).json({
        success: true,
        message: "Changelog entry deleted successfully.",
        changelogs,
      });
    } catch (err) {
      console.error("[Changelog DELETE Error]", err);
      return res.status(500).json({ error: "Failed to delete changelog." });
    }
  });

  // 4. CLEAR ALL: ONLY master can purge changelogs
  app.post("/api/admin/changelogs/clear-all", requireMaster(), async (_req: AuthRequest, res) => {
    try {
      const result = await Changelog.deleteMany({});
      return res.status(200).json({
        success: true,
        message: `Cleared ${result.deletedCount} changelog entry/entries.`,
        changelogs: [],
      });
    } catch (err) {
      console.error("[Changelog Clear Error]", err);
      return res.status(500).json({ error: "Failed to clear changelogs." });
    }
  });

  // Public Booking Endpoint
  app.post("/api/schedule-session", bookingLimiter, async (req, res) => {
    const date = sanitizeString(req.body.date, 50);
    const time = sanitizeString(req.body.time, 20);
    const email = sanitizeString(req.body.email, 254);
    const phone = sanitizeString(req.body.phone, 30);
    const schoolName = sanitizeString(req.body.schoolName || req.body.name, 200);
    const additionalInfo = sanitizeString(req.body.additionalInfo, 1000);

    if (!email || !isValidEmail(email)) return res.status(400).json({ error: "A valid email address is required." });
    if (!phone || phone.length < 5) return res.status(400).json({ error: "A valid phone number is required." });
    if (!date) return res.status(400).json({ error: "Selected date is required." });

    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime()) && parsedDate.getDay() === 0) {
      return res.status(400).json({ error: "Trial sessions are not available on Sundays. Please select a Monday through Saturday date." });
    }

    if (!time || !isTimeWithinWorkingHours(time)) {
      return res.status(400).json({ error: "Scheduling time must be strictly between 9:00 AM and 4:00 PM." });
    }

    try {
      // 1. Create DB record if MongoDB is connected
      if (mongoose.connection.readyState === 1) {
        await Booking.create({ date, time, email, phone, schoolName, additionalInfo });
      } else {
        console.warn("[BOOKING] MongoDB is offline: recording booking and dispatching notification without DB persistence.");
      }

      const eventData = { dateStr: date, timeStr: time, email, phone, schoolName, additionalInfo };
      const gcalUrl = generateClientGoogleCalendarUrl(eventData);
      const hostGcalResult = await syncHostGoogleCalendar(eventData);

      // 2. Dispatch WhatsApp Notification via Queue / Direct API
      const messageText = `*New Booking: ${date} at ${time}*\nEmail: ${email}\nPhone: ${phone}\nSchool: ${schoolName}\nInfo: ${additionalInfo}`;
      await enqueueWhatsAppMessage({ messageText, phone });

      let bookedDates: string[] = [];
      if (mongoose.connection.readyState === 1) {
        const bookings = await Booking.find({}, { date: 1, _id: 0 });
        bookedDates = bookings.map(b => b.date);
      }

      return res.status(200).json({
        success: true,
        message: "Booking confirmed successfully!",
        gcalUrl,
        hostGcalResult,
        bookedDates
      });
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(400).json({ error: `The date "${date}" has already been booked by another client. Please select a different date.` });
      }
      console.error("Error processing session booking:", err);
      return res.status(500).json({ error: "Failed to process booking request." });
    }
  });

  const staticPath = process.env.NODE_ENV === "production" ? path.resolve(__dirname, "public") : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath, {
    maxAge: process.env.NODE_ENV === "production" ? "1y" : 0,
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html") || filePath.endsWith("sw.js")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      } else if (filePath.match(/\.(js|css|webp|png|jpg|jpeg|svg|woff2|woff|ttf)$/)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }));

  app.get("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`Backend Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
