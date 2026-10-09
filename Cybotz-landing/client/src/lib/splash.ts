/**
 * Cybotz intro — tunables.
 *
 * Colors match the site theme in `client/src/index.css`:
 *   cyan #00F0FF, sky #38BDF8, void #0A0F1D (aether canvas), ink #0F172A.
 * Fonts are Space Mono (display) and Inter (body), already loaded in index.html.
 *
 * Designed runtime is `exitAt + flight` seconds (about 3.6s), inside the 2.5–4s window.
 * Skip and reduced-motion use the shorter fades below.
 */

export const SPLASH_STORAGE_KEY = "cybotz-splash-seen";

export const SPLASH_COLORS = {
  /** Same fill as the homepage aether canvas so the handoff doesn't flash. */
  void: "#0A0F1D",
  cyan: "#00F0FF",
  sky: "#38BDF8",
  ink: "#0F172A",
} as const;

export const SPLASH_TIMING = {
  /** PCB trace draw + aperture morph. */
  circuitAt: 0.12,
  /** Kinetic CYBOTZ slam. */
  lettersAt: 0.78,
  /** Glitch slice, scan, and light sweep. */
  glitchAt: 1.48,
  /** DRONES / ROBOTICS / ELECTRONICS chips. */
  chipsAt: 1.64,
  /** "Building autonomous futures". */
  tagAt: 1.9,
  /** Kinetic lockup dissolves into the real logo. */
  resolveAt: 2.28,
  /** Logo flies into the header and the page is revealed. */
  exitAt: 2.8,
  flight: 0.82,
  skipFade: 0.28,
  /** prefers-reduced-motion: short fade, no travel. */
  reducedIn: 0.28,
  reducedHold: 0.42,
  reducedOut: 0.32,
} as const;

let playedThisPageLoad = false;

export function shouldPlaySplash(pathname: string): boolean {
  if (playedThisPageLoad) return false;
  if (pathname !== "/" && pathname !== "") return false;
  try {
    if (sessionStorage.getItem(SPLASH_STORAGE_KEY) === "1") {
      playedThisPageLoad = true;
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

export function markSplashSeen(): void {
  playedThisPageLoad = true;
  try {
    sessionStorage.setItem(SPLASH_STORAGE_KEY, "1");
  } catch {
    /* Private mode and blocked storage still get the in-memory guard. */
  }
}
