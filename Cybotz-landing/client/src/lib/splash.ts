/**
 * Cybotz intro — tunables.
 *
 * Colors are the light site theme. Cyan and orange are sampled from the
 * CYBOTZ wordmark (client/public/logos/cybotz_transparent.png):
 *   cyan #0575CE, orange #F97405. Small text uses darker same-hue inks
 *   so it clears WCAG AA on paper #F4F7FB.
 * Fonts are Space Mono (display) and Inter (body), already loaded in index.html.
 *
 * Designed runtime is `exitAt + flight` seconds (about 3.6s), inside the 2.5–4s window.
 * Skip and reduced-motion use the shorter fades below.
 */

export const SPLASH_STORAGE_KEY = "cybotz-splash-seen";

export const SPLASH_COLORS = {
  /** Same fill as the homepage aether canvas so the handoff doesn't flash. */
  void: "#F4F7FB",
  /** Logo cyan. Graphics, traces, and large marks. */
  cyan: "#0575CE",
  /** Darker cyan for small text on paper (AA). */
  cyanInk: "#0460A9",
  /** Logo orange. CTA fills, trace packets, energetic marks. */
  orange: "#F97405",
  /** Darker orange for small text and counters on paper (AA). */
  orangeInk: "#A04B03",
  sky: "#3D8FD4",
  /** Page ink. Also the text color on orange fills (white-on-orange fails AA). */
  ink: "#102033",
  muted: "#3E5168",
  paper: "#F4F7FB",
  raised: "#FFFFFF",
  section: "#E7EEF6",
  line: "#D5E0EA",
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
