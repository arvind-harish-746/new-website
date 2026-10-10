import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";

/**
 * Drop the cinematic in these files (muted playback, about 4–6s).
 * Desktop is 16:9, mobile is 9:16. Until the files exist, a load error
 * or stall skips straight to the hero.
 */
export const SPLASH_DESKTOP = "/media/splash-desktop.mp4";
export const SPLASH_MOBILE = "/media/splash-mobile.mp4";
export const SPLASH_POSTER = "/media/splash-poster.jpg";

/** 0 while the video covers the page, 1 when the 3D drone has the hero pose. */
export type SplashHandoff = { blend: number };

const WORD = [
  ["C", "#0575CE"],
  ["Y", "#0575CE"],
  ["B", "#0575CE"],
  ["O", "#F97405"],
  ["T", "#F97405"],
  ["Z", "#F97405"],
] as const;

const LOCKUP_LEAD = 1.5;
const HANDOFF_MS = 720;
const PLAY_TIMEOUT_MS = 2800;
const STALL_MS = 2500;
const HARD_CAP_MS = 12000;

function smooth(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function Wordmark({ visible }: { visible: boolean }) {
  return (
    <div className={visible ? "splash-word is-in" : "splash-word"}>
      {WORD.map(([letter, color]) => (
        <span key={letter} style={{ color }}>
          {letter}
        </span>
      ))}
      <p className="splash-tag">Building autonomous futures</p>
    </div>
  );
}

export function VideoSplash({
  handoffRef,
  onDone,
}: {
  handoffRef: MutableRefObject<SplashHandoff>;
  onDone: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const skipRef = useRef<(() => void) | null>(null);
  const [lockup, setLockup] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;

    let disposed = false;
    let finished = false;
    let handing = false;
    let raf = 0;

    const paint = (t: number) => {
      handoffRef.current.blend = t;
      const fade = 1 - smooth(t);
      const root = rootRef.current;
      if (!root) return;
      root.style.opacity = fade.toFixed(3);
      const media = root.querySelector(".video-splash-media");
      if (media instanceof HTMLElement) media.style.transform = `scale(${(1 + t * 0.06).toFixed(4)})`;
    };

    const finishNow = () => {
      if (finished || disposed) return;
      finished = true;
      handoffRef.current.blend = 1;
      onDone();
    };

    const beginHandoff = () => {
      if (finished || disposed) return;
      if (handing) {
        finishNow();
        return;
      }
      handing = true;
      video.pause();
      const start = performance.now();
      const tick = (now: number) => {
        if (finished || disposed) return;
        const t = Math.min(1, (now - start) / HANDOFF_MS);
        paint(t);
        if (t >= 1) finishNow();
        else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    skipRef.current = beginHandoff;

    const armLockup = () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (video.currentTime >= Math.max(0, duration - LOCKUP_LEAD)) setLockup(true);
    };

    let playing = false;
    let lastAdvance = performance.now();
    const started = performance.now();

    const onTime = () => {
      if (video.currentTime > 0) lastAdvance = performance.now();
      armLockup();
    };
    const onPlaying = () => {
      playing = true;
      lastAdvance = performance.now();
    };

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", armLockup);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("ended", beginHandoff);
    video.addEventListener("error", finishNow);

    if (video.error) finishNow();
    const playAttempt = video.play();
    if (playAttempt) playAttempt.catch(() => finishNow());

    const timer = window.setInterval(() => {
      if (finished || handing) return;
      const now = performance.now();
      if (!playing && now - started > PLAY_TIMEOUT_MS) finishNow();
      else if (playing && now - lastAdvance > STALL_MS) finishNow();
      else if (now - started > HARD_CAP_MS) finishNow();
    }, 200);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        beginHandoff();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      disposed = true;
      skipRef.current = null;
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", armLockup);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("ended", beginHandoff);
      video.removeEventListener("error", finishNow);
      video.pause();
    };
  }, [handoffRef, onDone]);

  return createPortal(
    <div
      ref={rootRef}
      className="video-splash"
      role="dialog"
      aria-modal="true"
      aria-label="Cybotz introduction"
      onClick={() => skipRef.current?.()}
    >
      <video
        ref={videoRef}
        className="video-splash-media"
        muted
        autoPlay
        playsInline
        preload="auto"
        poster={SPLASH_POSTER}
        disablePictureInPicture
      >
        <source src={SPLASH_MOBILE} type="video/mp4" media="(max-width: 767px)" />
        <source src={SPLASH_DESKTOP} type="video/mp4" />
      </video>
      <Wordmark visible={lockup} />
      <button type="button" className="splash-skip">
        Skip
      </button>
    </div>,
    document.body,
  );
}

export function ReducedSplash({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (done.current) return;
      done.current = true;
      onDone();
    };
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const fade = t < 0.42 ? 1 : 1 - Math.min(1, (t - 0.42) / 0.48);
      if (rootRef.current) rootRef.current.style.opacity = fade.toFixed(3);
      if (t >= 0.95) finish();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [onDone]);

  return createPortal(
    <div
      ref={rootRef}
      className="video-splash is-poster"
      role="dialog"
      aria-modal="true"
      aria-label="Cybotz introduction"
      onClick={() => {
        if (done.current) return;
        done.current = true;
        onDone();
      }}
    >
      <img className="video-splash-media" src={SPLASH_POSTER} alt="" />
      <Wordmark visible />
      <button type="button" className="splash-skip">
        Skip
      </button>
    </div>,
    document.body,
  );
}
