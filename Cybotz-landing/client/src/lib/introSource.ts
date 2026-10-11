/**
 * Swap the intro by dropping the Blender smash at these paths.
 * A missing file keeps the live 3D drone as the intro. Nothing watermarked ships.
 */
export const INTRO_VIDEO = "/media/intro-1080.mp4";
export const INTRO_VIDEO_WEBM = "/media/intro-1080.webm";
export const INTRO_POSTER = "/media/intro-poster.webp";
export const INTRO_END = "/media/intro-end.webp";
export const INTRO_END_BLUR = "/media/intro-end-blur.webp";
export const INTRO_SEEN_KEY = "cybotz-intro-autoplay";

export async function introClipReady(): Promise<boolean> {
  try {
    const res = await fetch(INTRO_VIDEO, { method: "HEAD" });
    const type = res.headers.get("content-type") || "";
    return res.ok && type.startsWith("video/");
  } catch {
    return false;
  }
}
