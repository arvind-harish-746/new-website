import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * All-intra H.264 (every frame a keyframe, faststart, no audio).
 * A long-GOP file snaps between keyframes when currentTime is scrubbed.
 * One video request is also simpler than a 60–120 frame image sequence.
 * Desktop is the 720p camera original, zoomed just enough to drop the
 * bottom-right watermark. Mobile is the 9:16 full frame, same treatment.
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

const REVEAL_AT = 0.84;
const LERP = 0.2;
const SEEK_GAP = 0.04;

function prefers(query: string) {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
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

export function ScrollScrub() {
  const [portrait, setPortrait] = useState(() => prefers("(max-width: 767px)"));
  const [reduce, setReduce] = useState(() => prefers("(prefers-reduced-motion: reduce)"));
  const [ready, setReady] = useState(false);
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
    document.documentElement.dataset.droneReveal = reduce ? "1" : "0";
    return () => {
      document.documentElement.dataset.droneReveal = "1";
    };
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    const video = videoRef.current;
    if (!video) return;
    const ctrl = new AbortController();
    let blobUrl = "";
    let dead = false;

    const arm = (url: string) => {
      video.style.opacity = "0";
      video.src = url;
      video.pause();
      const show = () => {
        video.style.opacity = "1";
      };
      video.addEventListener("loadeddata", show, { once: true });
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
    if (!section) return;
    let current = 0;
    let raf = 0;

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
      const target = targetRef.current;
      current += (target - current) * LERP;
      if (Math.abs(target - current) < 0.0005) current = target;
      const video = videoRef.current;
      if (video && video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0 && !video.seeking) {
        const next = current * video.duration;
        if (Math.abs(video.currentTime - next) > SEEK_GAP) video.currentTime = next;
      }
      const reveal = current <= REVEAL_AT ? 0 : Math.min(1, (current - REVEAL_AT) / (1 - REVEAL_AT));
      document.documentElement.dataset.droneReveal = reveal.toFixed(3);
      section.dataset.progress = current.toFixed(3);
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
        const shards = smoothstep(0.55, 0.68, current) * (1 - smoothstep(0.9, 1, current));
        shardRef.current.style.opacity = shards.toFixed(3);
      }
      paint(hintRef.current, band(current, 0, 0.1));
      paint(line1Ref.current, band(current, 0.12, 0.34));
      paint(line2Ref.current, band(current, 0.4, 0.58));
      paint(line3Ref.current, band(current, 0.62, 0.8));
      paint(wordRef.current, band(current, 0.78, 0.93));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 80);

    return () => {
      window.clearTimeout(refresh);
      cancelAnimationFrame(raf);
      trigger.kill();
    };
  }, [reduce]);

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
