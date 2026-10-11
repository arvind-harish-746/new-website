import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Hybrid intro. The approach (0 → impact) autoplays once per tab at 1.5×,
 * muted. Scroll then scrubs the burst from 3s to 6s. The file is trimmed at
 * 6.5s and is not cropped — the footage watermark stays in frame.
 *
 * All-intra H.264 (every frame a keyframe, faststart, no audio) so a
 * currentTime seek lands on that frame. Seeks are gated: only while paused,
 * only when the element is not already seeking, and only when the delta is
 * larger than SEEK_GAP.
 *
 * Impact audio is synthesized with the Web Audio API (noise burst, inharmonic
 * partials, bandpass whoosh). There is no third-party recording. It stays
 * muted until a visitor turns the toggle on, and it never autoplays.
 */
const DESKTOP_SRC = "/media/scrub-desktop.mp4";
const MOBILE_SRC = "/media/scrub-mobile.mp4";
const DESKTOP_POSTER = "/media/scrub-poster.webp";
const MOBILE_POSTER = "/media/scrub-poster-mobile.webp";
const DESKTOP_END = "/media/scrub-end.webp";
const MOBILE_END = "/media/scrub-end-mobile.webp";

const WORD = [
  ["C", "#0575CE"],
  ["Y", "#0575CE"],
  ["B", "#0575CE"],
  ["O", "#F97405"],
  ["T", "#F97405"],
  ["Z", "#F97405"],
] as const;

const SHARDS = [
  { l: "8%", t: "18%", r: -18, w: 14, h: 28 },
  { l: "16%", t: "62%", r: 24, w: 10, h: 22 },
  { l: "78%", t: "22%", r: 12, w: 16, h: 30 },
  { l: "86%", t: "58%", r: -28, w: 11, h: 24 },
  { l: "48%", t: "12%", r: 8, w: 8, h: 18 },
  { l: "42%", t: "74%", r: -14, w: 18, h: 12 },
  { l: "62%", t: "46%", r: 32, w: 9, h: 20 },
  { l: "28%", t: "40%", r: -6, w: 7, h: 16 },
  { l: "70%", t: "70%", r: 18, w: 13, h: 26 },
  { l: "34%", t: "28%", r: -22, w: 6, h: 14 },
] as const;

/** Bright flash just before 3s. Freeze here, then scrub 3s → 6s. */
const IMPACT = 2.96;
const SCRUB_FROM = 3;
const SCRUB_TO = 6;
const PLAY_RATE = 1.5;
const HOLD_MS = 125;
const SEEN_KEY = "cybotz-intro-autoplay";
const REVEAL_AT = 0.78;
const LERP = 0.2;
const SEEK_GAP = 0.04;
const ARM_MS = 1500;

type Phase = "play" | "freeze" | "hold" | "scrub";

function prefers(query: string) {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

function seenAlready() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* private mode */
  }
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function band(progress: number, enter: number, leave: number) {
  const fade = 0.035;
  return smoothstep(enter, enter + fade, progress) * (1 - smoothstep(leave - fade, leave, progress));
}

function paint(el: HTMLElement | null, opacity: number) {
  if (!el) return;
  el.style.opacity = opacity.toFixed(3);
}

function scrubTime(progress: number) {
  if (progress <= 0.001) return IMPACT;
  return SCRUB_FROM + Math.min(1, progress) * (SCRUB_TO - SCRUB_FROM);
}

/**
 * Short glass hit plus a whoosh. Oscillators and a noise buffer only —
 * nothing is fetched, and the video element stays muted.
 */
function playGlass(ctx: AudioContext) {
  const now = ctx.currentTime;
  const burst = 0.32;
  const count = Math.floor(ctx.sampleRate * burst);
  const buffer = ctx.createBuffer(1, count, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < count; i += 1) {
    const t = i / ctx.sampleRate;
    const env = Math.exp(-t * 22) * (1 - Math.exp(-t * 90));
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(2200, now);
  bandpass.frequency.exponentialRampToValueAtTime(480, now + 0.28);
  bandpass.Q.value = 0.7;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.42, now + 0.012);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  noise.connect(bandpass);
  bandpass.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + burst);

  [640, 980, 1510, 2140, 2890].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    const gain = ctx.createGain();
    const peak = 0.1 / (1 + index * 0.4);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26 + index * 0.02);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  });

  const whooshLen = 0.42;
  const whooshCount = Math.floor(ctx.sampleRate * whooshLen);
  const whooshBuffer = ctx.createBuffer(1, whooshCount, ctx.sampleRate);
  const whooshData = whooshBuffer.getChannelData(0);
  for (let i = 0; i < whooshCount; i += 1) whooshData[i] = Math.random() * 2 - 1;
  const whoosh = ctx.createBufferSource();
  whoosh.buffer = whooshBuffer;
  const whooshFilter = ctx.createBiquadFilter();
  whooshFilter.type = "bandpass";
  whooshFilter.Q.value = 1.1;
  whooshFilter.frequency.setValueAtTime(220, now + 0.04);
  whooshFilter.frequency.exponentialRampToValueAtTime(2600, now + 0.2);
  whooshFilter.frequency.exponentialRampToValueAtTime(540, now + 0.4);
  const whooshGain = ctx.createGain();
  whooshGain.gain.setValueAtTime(0.0001, now);
  whooshGain.gain.exponentialRampToValueAtTime(0.22, now + 0.1);
  whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  whoosh.connect(whooshFilter);
  whooshFilter.connect(whooshGain);
  whooshGain.connect(ctx.destination);
  whoosh.start(now);
  whoosh.stop(now + whooshLen);
}

export function ScrollScrub() {
  const [portrait, setPortrait] = useState(() => prefers("(max-width: 767px)"));
  const [reduce, setReduce] = useState(() => prefers("(prefers-reduced-motion: reduce)"));
  const [ready, setReady] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const pictureRef = useRef<HTMLDivElement>(null);
  const frostRef = useRef<HTMLDivElement>(null);
  const shardRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const line1Ref = useRef<HTMLParagraphElement>(null);
  const line2Ref = useRef<HTMLParagraphElement>(null);
  const line3Ref = useRef<HTMLParagraphElement>(null);
  const wordRef = useRef<HTMLParagraphElement>(null);
  const targetRef = useRef(0);
  const phaseRef = useRef<Phase>(seenAlready() ? "hold" : "play");
  const soundOnRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const playedRef = useRef(false);
  const armUntilRef = useRef(0);

  const src = portrait ? MOBILE_SRC : DESKTOP_SRC;
  const poster = portrait ? MOBILE_POSTER : DESKTOP_POSTER;
  const endStill = portrait ? MOBILE_END : DESKTOP_END;

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMobile = () => setPortrait(mobile.matches);
    const onMotion = () => setReduce(motion.matches);
    mobile.addEventListener("change", onMobile);
    motion.addEventListener("change", onMotion);
    return () => {
      mobile.removeEventListener("change", onMobile);
      motion.removeEventListener("change", onMotion);
    };
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.droneReveal = reduce ? "1" : "0";
    if (!reduce && phaseRef.current === "play") root.dataset.introLock = "1";
    return () => {
      root.dataset.droneReveal = "1";
      delete root.dataset.introLock;
    };
  }, [reduce]);

  useEffect(() => {
    return () => {
      const ctx = audioRef.current;
      audioRef.current = null;
      if (ctx) void ctx.close();
    };
  }, []);

  useEffect(() => {
    if (reduce) return;
    const video = videoRef.current;
    if (!video) return;
    const ctrl = new AbortController();
    let blobUrl = "";
    let dead = false;

    const arm = (url: string) => {
      video.style.opacity = "0";
      video.muted = true;
      video.defaultPlaybackRate = PLAY_RATE;
      video.playbackRate = PLAY_RATE;
      video.src = url;
      video.pause();
      const show = () => {
        video.style.opacity = "1";
      };
      if (phaseRef.current === "play") video.addEventListener("loadeddata", show, { once: true });
      else {
        video.addEventListener("seeked", show, { once: true });
        window.setTimeout(show, 800);
      }
      setReady(true);
    };

    void (async () => {
      try {
        const res = await fetch(src, { signal: ctrl.signal });
        if (!res.ok || !res.body) throw new Error("scrub video missing");
        const total = Number(res.headers.get("content-length")) || 0;
        const reader = res.body.getReader();
        const chunks: BlobPart[] = [];
        let loaded = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          chunks.push(value);
          loaded += value.byteLength;
          const pct = total > 0 ? Math.min(100, (loaded / total) * 100) : 0;
          if (barRef.current) barRef.current.style.width = `${total > 0 ? pct : 100}%`;
          if (meterRef.current) meterRef.current.setAttribute("aria-valuenow", String(Math.round(pct)));
        }
        blobUrl = URL.createObjectURL(new Blob(chunks, { type: "video/mp4" }));
        if (dead) return;
        arm(blobUrl);
      } catch {
        if (dead || ctrl.signal.aborted) return;
        arm(src);
      }
    })();

    return () => {
      dead = true;
      ctrl.abort();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [reduce, src]);

  useEffect(() => {
    if (reduce) return;
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    let current = 0;
    let raf = 0;
    let freezeTimer = 0;
    let started = false;
    const root = document.documentElement;

    const releaseLock = () => {
      if (!root.dataset.introLock) return;
      delete root.dataset.introLock;
      window.setTimeout(() => ScrollTrigger.refresh(), 40);
    };

    const fireImpact = () => {
      if (playedRef.current) return;
      armUntilRef.current = performance.now() + ARM_MS;
      const ctx = audioRef.current;
      if (!soundOnRef.current || !ctx || ctx.state !== "running") return;
      playedRef.current = true;
      playGlass(ctx);
    };

    const snapImpact = () => {
      if (video.readyState < 1 || !Number.isFinite(video.duration) || video.duration <= 0) return;
      const next = Math.min(IMPACT, Math.max(0, video.duration - 0.05));
      if (Math.abs(video.currentTime - next) > 0.03) {
        try {
          video.currentTime = next;
        } catch {
          /* seek before metadata */
        }
      }
    };

    const arrive = () => {
      if (phaseRef.current !== "play") return;
      phaseRef.current = "freeze";
      video.pause();
      video.muted = true;
      snapImpact();
      markSeen();
      releaseLock();
      fireImpact();
      window.clearTimeout(freezeTimer);
      freezeTimer = window.setTimeout(() => {
        if (phaseRef.current === "freeze") phaseRef.current = "hold";
      }, HOLD_MS);
    };

    const tryPlay = () => {
      if (started || phaseRef.current !== "play") return;
      if (video.readyState < 2) return;
      started = true;
      video.muted = true;
      video.playbackRate = PLAY_RATE;
      try {
        video.currentTime = 0;
      } catch {
        /* not seekable yet */
      }
      root.dataset.introLock = "1";
      void video.play().catch(() => arrive());
    };

    if (phaseRef.current !== "play") {
      video.pause();
      video.muted = true;
      const park = () => snapImpact();
      if (video.readyState >= 1) park();
      else video.addEventListener("loadeddata", park, { once: true });
      armUntilRef.current = performance.now() + ARM_MS;
    }

    const onReady = () => {
      if (phaseRef.current === "play") tryPlay();
      else snapImpact();
    };
    video.addEventListener("canplay", onReady);
    tryPlay();

    const skipTarget = (target: EventTarget | null) => {
      const el = target instanceof Element ? target : null;
      if (!el) return false;
      return Boolean(el.closest("input, textarea, select, [contenteditable='true'], .scrub-sound"));
    };

    const onPointer = (event: PointerEvent) => {
      if (phaseRef.current !== "play") return;
      if (skipTarget(event.target)) return;
      arrive();
    };

    const onKey = (event: KeyboardEvent) => {
      if (phaseRef.current !== "play" && phaseRef.current !== "freeze") return;
      if (skipTarget(event.target)) return;
      const scrolling = event.key === " " || event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "PageDown" || event.key === "PageUp" || event.key === "Home" || event.key === "End";
      if (scrolling) event.preventDefault();
      if (phaseRef.current !== "play" || event.key === "Tab") return;
      arrive();
    };

    const onWheel = (event: WheelEvent) => {
      if (phaseRef.current !== "play" && phaseRef.current !== "freeze") return;
      event.preventDefault();
      if (phaseRef.current === "play") arrive();
    };

    const onTouch = (event: TouchEvent) => {
      if (phaseRef.current !== "play" && phaseRef.current !== "freeze") return;
      if (skipTarget(event.target)) return;
      event.preventDefault();
      if (phaseRef.current === "play") arrive();
    };

    const onScroll = () => {
      if (phaseRef.current !== "play" && phaseRef.current !== "freeze") return;
      if (window.scrollY > 2) {
        window.scrollTo({ top: 0, behavior: "instant" });
        if (phaseRef.current === "play") arrive();
      }
    };

    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchmove", onTouch, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.4,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        targetRef.current = self.progress;
      },
    });

    const tick = () => {
      const phase = phaseRef.current;
      if (phase === "play" && video.currentTime >= IMPACT - 0.02 && video.readyState >= 2) arrive();
      if (phase === "play") tryPlay();

      if (phase === "hold" || phase === "scrub") {
        const target = targetRef.current;
        current += (target - current) * LERP;
        if (Math.abs(target - current) < 0.0005) current = target;
        if (phase === "hold" && current > 0.012) phaseRef.current = "scrub";
        if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0 && !video.seeking) {
          const next = Math.min(scrubTime(current), Math.max(0, video.duration - 0.04));
          if (Math.abs(video.currentTime - next) > SEEK_GAP) video.currentTime = next;
        }
      }

      const scrubbing = phase === "hold" || phase === "scrub";
      const progress = scrubbing ? current : 0;
      const reveal = progress <= REVEAL_AT ? 0 : Math.min(1, (progress - REVEAL_AT) / (1 - REVEAL_AT));
      root.dataset.droneReveal = reveal.toFixed(3);
      section.dataset.progress = progress.toFixed(3);
      section.dataset.phase = phaseRef.current;
      const veil = smoothstep(0.02, 0.42, reveal);
      if (fadeRef.current) fadeRef.current.style.opacity = (1 - smoothstep(0.48, 0.96, reveal)).toFixed(3);
      if (pictureRef.current) {
        pictureRef.current.style.opacity = (1 - veil).toFixed(3);
        pictureRef.current.style.filter = `blur(${(veil * 22).toFixed(2)}px)`;
        const clear = veil * 76;
        const mask =
          veil < 0.02
            ? "none"
            : `linear-gradient(90deg, transparent 0%, transparent ${clear.toFixed(1)}%, #000 ${(clear + 14).toFixed(1)}%, #000 100%)`;
        pictureRef.current.style.maskImage = mask;
        pictureRef.current.style.setProperty("-webkit-mask-image", mask);
      }
      if (frostRef.current) {
        const frost = reveal <= 0.5 ? reveal / 0.5 : 1 - (reveal - 0.5) / 0.5;
        frostRef.current.style.opacity = frost.toFixed(3);
      }
      if (shardRef.current) {
        const shards = smoothstep(0.05, 0.25, progress) * (1 - smoothstep(0.82, 1, progress));
        shardRef.current.style.opacity = shards.toFixed(3);
      }
      const hint =
        phase === "play" || phase === "freeze" ? 0 : progress < 0.04 ? 1 : band(progress, 0, 0.1);
      paint(hintRef.current, hint);
      paint(line1Ref.current, band(progress, 0.12, 0.34));
      paint(line2Ref.current, band(progress, 0.4, 0.58));
      paint(line3Ref.current, band(progress, 0.62, 0.8));
      paint(wordRef.current, band(progress, 0.78, 0.93));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 80);

    return () => {
      window.clearTimeout(refresh);
      window.clearTimeout(freezeTimer);
      cancelAnimationFrame(raf);
      trigger.kill();
      video.removeEventListener("canplay", onReady);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("scroll", onScroll);
      releaseLock();
    };
  }, [reduce, src]);

  const toggleSound = () => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    if (!next) return;
    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioRef.current) audioRef.current = new Ctx();
    const ctx = audioRef.current;
    void ctx.resume().then(() => {
      if (playedRef.current || performance.now() > armUntilRef.current) return;
      playedRef.current = true;
      playGlass(ctx);
    });
  };

  return (
    <section
      id="sec-scrub"
      ref={sectionRef}
      className={reduce ? "scrub-section is-still" : "scrub-section"}
      aria-label="Cybotz introduction"
    >
      <div className="scrub-pin">
        <div className="scrub-fade" ref={fadeRef}>
          <div className="scrub-picture" ref={pictureRef}>
            {reduce ? (
              <img className="scrub-media" src={endStill} alt="" />
            ) : (
              <>
                <img className="scrub-media scrub-poster" src={poster} alt="" />
                <video
                  ref={videoRef}
                  className="scrub-media"
                  muted
                  playsInline
                  preload="none"
                  disablePictureInPicture
                  aria-hidden="true"
                />
              </>
            )}
            <div className="scrub-frost" ref={frostRef} />
          </div>
          <p className="sr-only">
            No shortcuts. Just hands-on learning. Real-World STEM Skills. Cybotz.
          </p>
          <p className="scrub-hint" ref={hintRef} aria-hidden="true">
            <span>Scroll</span>
            <i />
          </p>
          <div className="scrub-copy" aria-hidden="true">
            <p ref={line1Ref}>
              <span>No shortcuts.</span>
            </p>
            <p ref={line2Ref}>
              <span>Just hands-on learning.</span>
            </p>
            <p ref={line3Ref}>
              <span>Real-World STEM Skills</span>
            </p>
          </div>
          <p className="scrub-word" ref={wordRef} aria-hidden="true">
            {WORD.map(([letter, color]) => (
              <span key={letter} style={{ color }}>
                {letter}
              </span>
            ))}
          </p>
        </div>
        {!reduce && (
          <div className="scrub-shards" ref={shardRef} aria-hidden="true">
            {SHARDS.map((shard, index) => (
              <i
                key={index}
                style={{
                  left: shard.l,
                  top: shard.t,
                  width: shard.w,
                  height: shard.h,
                  transform: `rotate(${shard.r}deg)`,
                  animationDelay: `${index * 0.08}s`,
                }}
              />
            ))}
          </div>
        )}
        {!reduce && (
          <button
            type="button"
            className="scrub-sound"
            aria-pressed={soundOn}
            aria-label={soundOn ? "Mute impact sound" : "Play impact sound"}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={toggleSound}
          >
            {soundOn ? "Sound on" : "Sound"}
          </button>
        )}
        {!reduce && !ready && (
          <div
            ref={meterRef}
            className="scrub-load"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            aria-label="Loading introduction"
          >
            <span>Loading</span>
            <div className="scrub-load-track">
              <div ref={barRef} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
