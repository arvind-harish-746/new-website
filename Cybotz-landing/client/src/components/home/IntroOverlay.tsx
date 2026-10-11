import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { playGlass } from "@/lib/glassHit";
import { INTRO_POSTER, INTRO_SEEN_KEY, INTRO_VIDEO, INTRO_VIDEO_WEBM, introClipReady } from "@/lib/introSource";
import { approachKey, heroKey, setIntroDriving, writePose } from "@/lib/dronePose";

type Mode = "off" | "stills" | "video";

function mode(): Mode {
  const value = document.documentElement.dataset.intro;
  if (value === "stills" || value === "video" || value === "off") return value;
  return "off";
}

function markStarted() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    /* private mode still finishes in memory */
  }
}

function settleHero() {
  document.documentElement.dataset.introPhase = "settled";
  delete document.documentElement.dataset.introLock;
  setIntroDriving(false);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  writePose({
    ...heroKey(window.innerWidth),
    explode: 0,
    blueprint: 0,
    sensor: 0,
    prop: reduce ? 0 : 52,
    opacity: 1,
    altitude: 0.2,
  });
  window.dispatchEvent(new Event("cybotz-intro-settled"));
}

/**
 * Fixed intro overlay. It stays off the page until the drone has drawn a frame
 * (or a real intro clip is ready). If neither arrives within 600ms, the hero shows.
 */
export function IntroOverlay() {
  const [active, setActive] = useState(() => mode() !== "off");
  const [shown, setShown] = useState(false);
  const [skipOn, setSkipOn] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [clip, setClip] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(false);
  const playedRef = useRef(false);
  const doneRef = useRef(false);
  const revealedRef = useRef(false);
  const finishRef = useRef<(quick: boolean) => void>(() => undefined);
  const flyTimerRef = useRef(0);
  const clipRef = useRef(false);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    clipRef.current = clip;
    if (clip) window.clearTimeout(flyTimerRef.current);
  }, [clip]);

  useEffect(() => {
    if (!active || doneRef.current) return;
    revealedRef.current = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIntroDriving(true);
    writePose({
      ...approachKey(window.innerWidth),
      explode: 0,
      blueprint: 0,
      sensor: 0,
      prop: reduce ? 0 : 8,
      opacity: 1,
      altitude: 0.45,
    });

    let cancelled = false;
    const reveal = () => {
      if (cancelled || doneRef.current || revealedRef.current) return;
      revealedRef.current = true;
      document.documentElement.dataset.introPhase = "flight";
      document.documentElement.dataset.introLock = "1";
      markStarted();
      setShown(true);
    };

    const abort = () => {
      if (cancelled || revealedRef.current || doneRef.current) return;
      doneRef.current = true;
      setActive(false);
      settleHero();
    };

    const onFrame = () => {
      if (cancelled || doneRef.current || revealedRef.current) return;
      revealedRef.current = true;
      requestAnimationFrame(() => {
        if (cancelled || doneRef.current) return;
        document.documentElement.dataset.introPhase = "flight";
        document.documentElement.dataset.introLock = "1";
        markStarted();
        setShown(true);
      });
    };
    if (document.documentElement.dataset.droneFrame === "1") onFrame();
    window.addEventListener("cybotz-drone-frame", onFrame);

    const deadline = window.setTimeout(abort, 600);
    void introClipReady().then((ok) => {
      if (cancelled || doneRef.current || !ok) return;
      setClip(true);
      reveal();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(deadline);
      window.removeEventListener("cybotz-drone-frame", onFrame);
    };
  }, [active]);

  useEffect(() => {
    if (!active || !shown) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = { ...approachKey(window.innerWidth) };
    writePose({ ...from, explode: 0, blueprint: 0, sensor: 0, prop: reduce ? 0 : 8, opacity: 1, altitude: 0.45 });

    const skipTimer = window.setTimeout(() => setSkipOn(true), 400);

    const hit = () => {
      if (!soundOnRef.current || playedRef.current) return;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      if (ctx.state !== "running") return;
      playedRef.current = true;
      playGlass(ctx);
    };

    const finish = (quick: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      const to = heroKey(window.innerWidth);
      gsap.to(from, {
        x: to.x,
        y: to.y,
        s: to.s,
        yaw: to.yaw,
        pitch: to.pitch,
        roll: to.roll,
        duration: quick ? 0.45 : 1.2,
        ease: "expo.out",
        overwrite: true,
        onUpdate: () =>
          writePose({
            ...from,
            prop: reduce ? 0 : 52,
            opacity: 1,
            altitude: 0.35,
            explode: 0,
            blueprint: 0,
            sensor: 0,
          }),
      });
      const veil = rootRef.current;
      const close = () => {
        setActive(false);
        setShown(false);
        document.documentElement.dataset.introPhase = "settled";
        delete document.documentElement.dataset.introLock;
        setIntroDriving(false);
        window.dispatchEvent(new Event("cybotz-intro-settled"));
      };
      if (veil) {
        gsap.to(veil, {
          opacity: 0,
          duration: quick ? 0.3 : 0.6,
          delay: quick ? 0.12 : 0.36,
          ease: "power2.inOut",
          onComplete: close,
        });
      } else close();
    };
    finishRef.current = finish;

    const onSkip = (event: Event) => {
      if (doneRef.current) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, .intro-sound, .intro-skip")) {
        if (!event.target.closest(".intro-skip")) return;
      }
      if (event.type === "keydown") {
        const key = (event as KeyboardEvent).key;
        if (key === "Tab") return;
        if (key !== "Escape" && key !== " " && key !== "Enter") return;
      }
      if (event.type === "keydown" || event.type === "wheel" || event.type === "touchstart") {
        event.preventDefault();
      }
      finish(true);
    };

    const onClipEnd = () => finish(false);
    window.addEventListener("keydown", onSkip);
    window.addEventListener("wheel", onSkip, { passive: false });
    window.addEventListener("touchstart", onSkip, { passive: false });
    window.addEventListener("cybotz-intro-clip-end", onClipEnd);

    const droneTimer = window.setTimeout(() => hit(), reduce ? 0 : 900);
    if (!clipRef.current) {
      flyTimerRef.current = window.setTimeout(() => finish(false), reduce ? 160 : 1700);
    }

    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(droneTimer);
      window.clearTimeout(flyTimerRef.current);
      window.removeEventListener("keydown", onSkip);
      window.removeEventListener("wheel", onSkip);
      window.removeEventListener("touchstart", onSkip);
      window.removeEventListener("cybotz-intro-clip-end", onClipEnd);
    };
  }, [active, shown]);

  useEffect(() => {
    if (!clip || !active) return;
    const video = videoRef.current;
    if (!video) return;
    let hitDone = false;
    const play = () => {
      video.playbackRate = 1.5;
      void video.play().catch(() => {
        window.dispatchEvent(new Event("cybotz-intro-clip-end"));
      });
    };
    const onTime = () => {
      if (!hitDone && video.currentTime >= 2.9) {
        hitDone = true;
        video.playbackRate = 1;
        window.setTimeout(() => {
          if (video.paused) return;
          video.playbackRate = 1.25;
        }, 125);
        if (soundOnRef.current && audioRef.current?.state === "running" && !playedRef.current) {
          playedRef.current = true;
          playGlass(audioRef.current);
        }
      }
      if (video.currentTime >= 5.95) {
        video.pause();
        window.dispatchEvent(new Event("cybotz-intro-clip-end"));
      }
    };
    video.addEventListener("canplay", play, { once: true });
    video.addEventListener("timeupdate", onTime);
    return () => {
      video.removeEventListener("timeupdate", onTime);
    };
  }, [clip, active]);

  useEffect(() => {
    if (mode() !== "off") return;
    settleHero();
  }, []);

  const toggleSound = () => {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioRef.current) audioRef.current = new Ctx();
    if (!soundOn) void audioRef.current.resume();
    setSoundOn((on) => !on);
  };

  if (!active || !shown) return null;

  return (
    <div ref={rootRef} className="intro-overlay" role="dialog" aria-label="Flight intro">
      {clip && (
        <video ref={videoRef} className="intro-video" muted playsInline preload="auto" poster={INTRO_POSTER}>
          <source src={INTRO_VIDEO_WEBM} type="video/webm" />
          <source src={INTRO_VIDEO} type="video/mp4" />
        </video>
      )}
      <button type="button" className={`intro-skip${skipOn ? " is-on" : ""}`} onClick={() => finishRef.current(true)}>
        Skip intro
      </button>
      <button type="button" className="intro-sound" aria-pressed={soundOn} onClick={toggleSound}>
        Sound {soundOn ? "on" : "off"}
      </button>
    </div>
  );
}
