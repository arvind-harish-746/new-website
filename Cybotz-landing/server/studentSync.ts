import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";
import { User } from "./models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StudentRow {
  name: string;
  phone: string;
  email?: string;
  rollNo?: string;
}

/**
 * Normalizes phone numbers (e.g., 9876543210 -> 919876543210)
 */
export function normalizePhoneNumber(rawPhone: string | number): string {
  if (!rawPhone) return "";
  const cleaned = String(rawPhone).replace(/[^\d+]/g, "").trim();
  const digitsOnly = cleaned.replace(/^\+/, "");
  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }
  return digitsOnly;
}

/**
 * Generates a clean, lowercase username from full name
 */
export function generateUsernameFromName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  return sanitized || `student.${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Lightweight native CSV parser for fallback
 */
function parseCsvRows(content: string): StudentRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("student"));
  const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("whatsapp") || h.includes("contact"));
  const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));
  const rollIdx = headers.findIndex((h) => h.includes("roll") || h.includes("id") || h.includes("class") || h.includes("grade"));

  if (nameIdx === -1 || phoneIdx === -1) return [];

  const students: StudentRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const name = cols[nameIdx];
    const phone = cols[phoneIdx];
    if (name && phone) {
      students.push({
        name,
        phone,
        email: emailIdx !== -1 ? cols[emailIdx] : undefined,
        rollNo: rollIdx !== -1 ? cols[rollIdx] : undefined,
      });
    }
  }
  return students;
}

/**
 * Reads student records from file (.xlsx, .xls, or .csv)
 */
export async function parseStudentFile(filePath: string): Promise<StudentRow[]> {
  if (!fs.existsSync(filePath)) return [];

  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".csv" || ext === ".txt") {
    const raw = await fs.promises.readFile(filePath, "utf8");
    return parseCsvRows(raw);
  }

  // Attempt dynamic xlsx parsing if available
  try {
    const xlsx = await import("xlsx");
    const workbook = xlsx.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = xlsx.utils.sheet_to_json(worksheet) as Record<string, any>[];

    const students: StudentRow[] = [];
    for (const r of rawRows) {
      const keys = Object.keys(r);
      const nameKey = keys.find((k) => /name|student/i.test(k));
      const phoneKey = keys.find((k) => /phone|mobile|whatsapp|contact/i.test(k));
      const emailKey = keys.find((k) => /email|mail/i.test(k));
      const rollKey = keys.find((k) => /roll|id|class|grade/i.test(k));

      if (nameKey && phoneKey && r[nameKey] && r[phoneKey]) {
        students.push({
          name: String(r[nameKey]).trim(),
          phone: String(r[phoneKey]).trim(),
          email: emailKey ? String(r[emailKey]).trim() : undefined,
          rollNo: rollKey ? String(r[rollKey]).trim() : undefined,
        });
      }
    }
    return students;
  } catch {
    // If xlsx not loaded, try fallback reading as text
    try {
      const raw = await fs.promises.readFile(filePath, "utf8");
      return parseCsvRows(raw);
    } catch {
      return [];
    }
  }
}

/**
 * Reconciles and syncs student records into MySQL database
 */
export async function syncStudents(studentsList: StudentRow[]): Promise<{
  created: number;
  skipped: number;
  total: number;
  details: string[];
}> {
  let created = 0;
  let skipped = 0;
  const details: string[] = [];

  for (const student of studentsList) {
    const normalizedPhone = normalizePhoneNumber(student.phone);
    if (!normalizedPhone || !student.name) {
      skipped++;
      continue;
    }

    // Check if a user with this phone or name already exists
    const existingByPhone = await User.findOne({ phone: normalizedPhone });
    if (existingByPhone) {
      // Ensure role is preserved as student
      if (existingByPhone.role !== "student" && existingByPhone.role !== "admin" && existingByPhone.role !== "editor" && existingByPhone.role !== "master") {
        existingByPhone.role = "student";
        await existingByPhone.save();
      }
      skipped++;
      continue;
    }

    // Generate unique username
    let baseUsername = generateUsernameFromName(student.name);
    let finalUsername = baseUsername;
    let counter = 1;
    while (await User.findOne({ username: finalUsername })) {
      counter++;
      finalUsername = `${baseUsername}${counter}`;
    }

    // Create temporary activation password
    const tempPasswordRaw = `Cybotz@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(tempPasswordRaw, 10);

    const newUser = await User.create({
      username: finalUsername,
      password: hashedPassword,
      role: "student",
      phone: normalizedPhone,
      mustChangePassword: true,
    });

    created++;
    details.push(`Created account for ${student.name} (${finalUsername})`);
  }

  return { created, skipped, total: studentsList.length, details };
}
