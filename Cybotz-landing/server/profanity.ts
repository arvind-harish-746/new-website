/**
 * Profanity & Cussword Moderation Utility
 * Filters and detects prohibited vulgarity/offensive words in comments.
 */

const PROFANITY_LIST = [
  "fuck", "shit", "bitch", "asshole", "bastard", "cunt", "dick", "pussy",
  "whore", "slut", "cock", "motherfucker", "fucker", "bullshit", "dumbass",
  "idiot", "retard", "fag", "faggot", "nigger", "nigga", "chutiya", "madarchod",
  "bhenchod", "gandu", "bsdk", "bhosdike", "harami", "lauda", "lodu", "kutta",
  "kamina", "saala", "randi", "mc", "bc"
];

const PROFANITY_REGEX = new RegExp(
  `\\b(${PROFANITY_LIST.join("|")})\\b`,
  "i"
);

export function containsProfanity(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  // Normalize simple leetspeak / punctuation evasion
  const normalized = text
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[3]/g, "e")
    .replace(/[$5]/g, "s")
    .replace(/[\*\.\_\-\+]/g, "");

  return PROFANITY_REGEX.test(text) || PROFANITY_REGEX.test(normalized);
}

export function sanitizeCommentText(text: string): string {
  if (!text) return "";
  return text.trim().slice(0, 2000);
}
