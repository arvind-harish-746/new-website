import { Request, Response, NextFunction } from "express";

const TURNSTILE_SECRET_KEY = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || "";
const CLOUDFLARE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerificationResult {
  success: boolean;
  errorCodes?: string[];
  hostname?: string;
  action?: string;
}

/**
 * Validates Cloudflare Turnstile token with Cloudflare's verification API.
 * Provides automatic pass-through in development mode if no secret key is set.
 */
export async function verifyTurnstileToken(
  token?: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  // Development / Offline Fallback: If no key is set or in dev, allow frictionless bypass
  if (!TURNSTILE_SECRET_KEY || process.env.NODE_ENV !== "production") {
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "Bot verification token missing. Please complete the security check." };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", TURNSTILE_SECRET_KEY);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const response = await fetch(CLOUDFLARE_VERIFY_URL, {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const data = (await response.json()) as TurnstileVerificationResult;

    if (data.success) {
      return { success: true };
    }

    return {
      success: false,
      error: "Bot protection challenge failed. Please refresh and try again.",
    };
  } catch (err) {
    console.error("[Turnstile Error]", err);
    // Fail-open or graceful handling if Cloudflare edge is momentarily unreachable
    return { success: true };
  }
}

/**
 * Express Middleware for routes requiring Cloudflare bot protection
 */
export function requireTurnstile() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // If running in development without a secret key, proceed directly
    if (!TURNSTILE_SECRET_KEY || process.env.NODE_ENV !== "production") {
      return next();
    }

    const turnstileToken =
      req.headers["cf-turnstile-token"] ||
      req.body?.turnstileToken ||
      req.body?.["cf-turnstile-response"];

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;

    const result = await verifyTurnstileToken(turnstileToken as string, clientIp);

    if (!result.success) {
      return res.status(403).json({ error: result.error || "Security verification failed." });
    }

    return next();
  };
}
