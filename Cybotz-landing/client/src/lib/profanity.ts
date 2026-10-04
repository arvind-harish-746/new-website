/**
 * Client-Side Profanity & Cussword Detection Utility
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
