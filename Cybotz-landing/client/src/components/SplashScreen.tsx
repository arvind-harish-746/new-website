import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { SPLASH_COLORS, SPLASH_TIMING, markSplashSeen } from "@/lib/splash";

type SplashGateValue = { suspendBackground: boolean };

const SplashGateContext = createContext<SplashGateValue>({ suspendBackground: false });

export function SplashGateProvider({
  value,
  children,
}: {
  value: SplashGateValue;
  children: ReactNode;
}) {
  return <SplashGateContext.Provider value={value}>{children}</SplashGateContext.Provider>;
}

export function useSplashGate() {
  return useContext(SplashGateContext);
}

const WORD = ["C", "Y", "B", "O", "T", "Z"] as const;
const CHIPS = ["DRONES", "ROBOTICS", "ELECTRONICS"] as const;

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  life: number;
  max: number;
  size: number;
  hot: number;
};

type Streak = {
  x: number;
  y: number;
  len: number;
  speed: number;
  z: number;
  alpha: number;
};

type MotionState = {
  warp: number;
  spool: number;
  morph: number;
  pointerX: number;
  pointerY: number;
  smoothX: number;
  smoothY: number;
};

interface SplashScreenProps {
  onExitStart: () => void;
  onComplete: () => void;
}

function spawnSpark(s: Spark, w: number, h: number, fresh: boolean) {
  s.z = 0.35 + Math.random() * 0.65;
  s.x = Math.random() * w;
  s.y = Math.random() * h;
  const angle = Math.random() * Math.PI * 2;
  const speed = (0.12 + Math.random() * 0.42) * s.z;
  s.vx = Math.cos(angle) * speed;
  s.vy = Math.sin(angle) * speed - 0.12 * s.z;
  s.max = 50 + Math.random() * 90;
  s.life = fresh ? Math.random() * s.max : s.max;
  s.size = (0.7 + Math.random() * 1.5) * s.z;
  s.hot = Math.random() > 0.8 ? 1 : 0;
}

function morphPath(morph: number, time: number): string {
  const count = 42;
  const cx = 80;
  const cy = 80;
  const radius = 62;
  let d = "";
  for (let i = 0; i < count; i++) {
    const u = i / (count - 1);
    const circle = -Math.PI / 2 + u * Math.PI * 2;
    const start = 0.62;
    const sweep = Math.PI * 2 - 1.24;
    const arc = start + u * sweep;
    const angle = circle + (arc - circle) * morph;
    const spur = i % 7 === 0 ? 16 * morph : 0;
    const wobble = (1 - morph) * Math.sin(time * 0.004 + i * 0.7) * 4;
    const r = radius + spur + wobble;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    d += i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : `L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

export default function SplashScreen({ onExitStart, onComplete }: SplashScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const kickerRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLParagraphElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const morphRef = useRef<SVGPathElement>(null);
  const glitchARef = useRef<HTMLSpanElement>(null);
  const glitchBRef = useRef<HTMLSpanElement>(null);
  const lettersRef = useRef<HTMLSpanElement[]>([]);
  const onExitStartRef = useRef(onExitStart);
  const onCompleteRef = useRef(onComplete);
  onExitStartRef.current = onExitStart;
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const html = document.documentElement;
    html.classList.add("cybotz-splash-lock");
    html.dataset.splash = "on";
    markSplashSeen();

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const motion: MotionState = {
      warp: reduce ? 0 : 1,
      spool: reduce ? 0 : 1,
      morph: reduce ? 1 : 0,
      pointerX: 0,
      pointerY: 0,
      smoothX: 0,
      smoothY: 0,
    };

    let raf = 0;
    let canvasRunning = !reduce;
    let allowParallax = finePointer && !reduce;
    const sparks: Spark[] = Array.from({ length: mobile ? 22 : 52 }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, z: 1, life: 1, max: 1, size: 1, hot: 0,
    }));
    const streaks: Streak[] = Array.from({ length: mobile ? 8 : 18 }, () => ({
      x: 0, y: 0, len: 40, speed: 4, z: 1, alpha: 0.4,
    }));
    let viewW = 0;
    let viewH = 0;

    const layoutField = () => {
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
      canvas.width = Math.max(1, Math.floor(viewW * dpr));
      canvas.height = Math.max(1, Math.floor(viewH * dpr));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sparks.forEach((spark) => spawnSpark(spark, viewW, viewH, true));
      streaks.forEach((streak) => {
        streak.z = 0.4 + Math.random() * 0.6;
        streak.x = Math.random() * viewW;
        streak.y = Math.random() * viewH;
        streak.len = (28 + Math.random() * 90) * streak.z;
        streak.speed = (3 + Math.random() * 9) * streak.z;
        streak.alpha = 0.25 + Math.random() * 0.55;
      });
    };

    const draw = (time: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx || viewW === 0) return;
      ctx.clearRect(0, 0, viewW, viewH);
      const cx = viewW * 0.5 + motion.smoothX * 22;
      const cy = viewH * 0.5 + motion.smoothY * 16;

      if (motion.warp > 0.03) {
        ctx.lineWidth = 1.25;
        for (let i = 0; i < streaks.length; i++) {
          const streak = streaks[i];
          streak.x += streak.speed * (0.35 + motion.warp * 2.6);
          if (streak.x > viewW + streak.len) streak.x = -streak.len;
          ctx.strokeStyle = `rgba(5, 117, 206, ${streak.alpha * motion.warp})`;
          ctx.beginPath();
          ctx.moveTo(streak.x, streak.y);
          ctx.lineTo(streak.x + streak.len * (0.35 + motion.warp), streak.y);
          ctx.stroke();
        }
      }

      for (let i = 0; i < sparks.length; i++) {
        const spark = sparks[i];
        spark.x += spark.vx * (1 + motion.warp * 3);
        spark.y += spark.vy * (1 + motion.warp * 2);
        spark.life -= 1;
        if (spark.life <= 0 || spark.x < -20 || spark.x > viewW + 20 || spark.y < -20 || spark.y > viewH + 20) {
          spawnSpark(spark, viewW, viewH, false);
        }
        const alpha = Math.min(1, spark.life / spark.max) * (0.35 + spark.z * 0.65);
        ctx.fillStyle = spark.hot
          ? `rgba(249, 116, 5, ${alpha})`
          : `rgba(5, 117, 206, ${alpha})`;
        const px = spark.x + motion.smoothX * 26 * spark.z;
        const py = spark.y + motion.smoothY * 18 * spark.z;
        ctx.fillRect(px, py, spark.size, spark.size);
      }

      const ring = Math.min(viewW, viewH) * (mobile ? 0.24 : 0.2);
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 2; k++) {
        const dir = k === 0 ? 1 : -1;
        const radius = ring * (k === 0 ? 1 : 0.74);
        const a0 = time * (0.0011 + motion.spool * 0.0045) * dir + k * 1.4;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, a0, a0 + 1.05 + motion.spool * 0.45);
        ctx.strokeStyle = k === 0
          ? `rgba(5, 117, 206, ${0.35 + motion.spool * 0.4})`
          : `rgba(249, 116, 5, ${0.28 + motion.spool * 0.28})`;
        ctx.stroke();
      }

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, ring * 1.6);
      glow.addColorStop(0, `rgba(5, 117, 206, ${0.06 + (1 - motion.warp) * 0.08})`);
      glow.addColorStop(1, "rgba(5, 117, 206, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, ring * 1.6, 0, Math.PI * 2);
      ctx.fill();

      if (morphRef.current && motion.morph < 0.995) {
        morphRef.current.setAttribute("d", morphPath(motion.morph, time));
      } else if (morphRef.current && motion.morph >= 0.995) {
        morphRef.current.setAttribute("d", morphPath(1, time));
      }

      if (allowParallax && parallaxRef.current) {
        motion.smoothX += (motion.pointerX - motion.smoothX) * 0.08;
        motion.smoothY += (motion.pointerY - motion.smoothY) * 0.08;
        parallaxRef.current.style.transform = `translate3d(${motion.smoothX * 12}px, ${motion.smoothY * 8}px, 0)`;
      }
    };

    const frame = (time: number) => {
      if (!canvasRunning) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      draw(time);
    };

    const stopCanvas = () => {
      canvasRunning = false;
      allowParallax = false;
      cancelAnimationFrame(raf);
    };

    layoutField();
    if (!reduce) {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => layoutField();
    const onPointer = (event: PointerEvent) => {
      if (!allowParallax) return;
      motion.pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      motion.pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });

    let timeline: gsap.core.Timeline | null = null;
    let closed = false;
    let skipping = false;
    let exitStarted = false;
    const unlock = () => {
      html.classList.remove("cybotz-splash-lock");
      html.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      delete html.dataset.splash;
    };
    const finish = () => {
      if (closed) return;
      closed = true;
      stopCanvas();
      unlock();
      onCompleteRef.current();
    };
    const armBackground = () => {
      if (exitStarted) return;
      exitStarted = true;
      stopCanvas();
      onExitStartRef.current();
    };

    const skip = () => {
      if (closed || skipping) return;
      skipping = true;
      timeline?.kill();
      gsap.killTweensOf([
        root, bgRef.current, stageRef.current, logoRef.current, skipRef.current,
        wordRef.current, flashRef.current, progressRef.current, tagRef.current, motion,
      ]);
      armBackground();
      delete html.dataset.splash;
      gsap.to(root, {
        opacity: 0,
        duration: SPLASH_TIMING.skipFade,
        ease: "power2.out",
        onComplete: finish,
      });
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        event.preventDefault();
        skipRef.current?.focus({ preventScroll: true });
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.startsWith("F") && event.key.length > 1) return;
      if ((event.key === " " || event.key === "Enter") && document.activeElement === skipRef.current) return;
      if (event.key === " " || event.key === "ArrowDown" || event.key === "ArrowUp") event.preventDefault();
      skip();
    };

    const onRootClick = (event: MouseEvent) => {
      event.stopPropagation();
      skip();
    };
    root.addEventListener("click", onRootClick);
    window.addEventListener("keydown", onKey);
    skipRef.current?.focus({ preventScroll: true });

    const failsafe = window.setTimeout(() => {
      if (!closed) skip();
    }, 5600);

    const traces = Array.from(root.querySelectorAll<SVGPathElement>(".splash-trace"));
    const nodes = Array.from(root.querySelectorAll<SVGCircleElement>(".splash-node"));
    const letters = lettersRef.current.filter(Boolean);

    try {
      if (reduce) {
        gsap.set(
          [kickerRef.current, wordRef.current, chipsRef.current, root.querySelector(".splash-mark")],
          { autoAlpha: 0 }
        );
        gsap.set(logoRef.current, { xPercent: -50, yPercent: -50, scale: 1, autoAlpha: 0 });
        gsap.set(tagRef.current, { autoAlpha: 0, y: 0 });
        const reduced = gsap.timeline({ onComplete: finish });
        timeline = reduced;
        reduced.to([logoRef.current, tagRef.current], {
          autoAlpha: 1,
          duration: SPLASH_TIMING.reducedIn,
          ease: "power1.out",
        });
        reduced.to({}, { duration: SPLASH_TIMING.reducedHold });
        reduced.call(() => {
          armBackground();
          delete html.dataset.splash;
        });
        reduced.to(root, { opacity: 0, duration: SPLASH_TIMING.reducedOut, ease: "power1.inOut" });
      } else {
        const bloomBlur = mobile ? "none" : "blur(12px)";
        gsap.set(logoRef.current, { xPercent: -50, yPercent: -50, scale: 0.84, autoAlpha: 0, filter: bloomBlur });
        gsap.set(letters, { yPercent: 125, rotation: (index) => (index % 2 === 0 ? 9 : -9), autoAlpha: 0 });
        gsap.set(wordRef.current, { letterSpacing: "0.34em" });
        gsap.set(".splash-corner", { autoAlpha: 0 });
        nodes.forEach((node) => {
          node.dataset.r = node.getAttribute("r") || "3";
          gsap.set(node, { attr: { r: 0 }, opacity: 0 });
        });
        gsap.set([kickerRef.current, tagRef.current], { autoAlpha: 0, y: 12 });
        if (chipsRef.current) gsap.set(chipsRef.current.children, { autoAlpha: 0, y: 12 });
        gsap.set(progressRef.current, { scaleX: 0, transformOrigin: "0% 50%" });

        traces.forEach((path) => {
          const length = path.getTotalLength();
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        });

        const tl = gsap.timeline();
        timeline = tl;
        tl.to(kickerRef.current, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" }, 0.08);
        tl.to(".splash-corner", { autoAlpha: 1, duration: 0.4, stagger: 0.04 }, 0.05);
        tl.to(morphRef.current, { opacity: 0.45, duration: 0.45 }, SPLASH_TIMING.circuitAt);
        tl.to(motion, { warp: 0, duration: 1.05, ease: "power2.out" }, 0.08);
        tl.to(motion, { morph: 1, duration: 1.15, ease: "power2.inOut" }, SPLASH_TIMING.circuitAt);
        tl.to(motion, { spool: 0.12, duration: 2.3, ease: "power1.inOut" }, 0.3);

        traces.forEach((path, index) => {
          tl.to(path, {
            strokeDashoffset: 0,
            duration: index === 0 ? 0.85 : 0.55,
            ease: "power2.inOut",
          }, SPLASH_TIMING.circuitAt + index * 0.06);
        });

        nodes.forEach((node, index) => {
          tl.to(node, {
            attr: { r: Number(node.dataset.r) },
            opacity: 1,
            duration: 0.36,
            ease: "back.out(2.2)",
          }, 0.62 + index * 0.05);
        });

        tl.to(letters, {
          yPercent: 0,
          rotation: 0,
          autoAlpha: 1,
          duration: 0.58,
          stagger: { each: 0.048, from: "center" },
          ease: "back.out(1.5)",
        }, SPLASH_TIMING.lettersAt);
        tl.to(wordRef.current, {
          letterSpacing: "0.04em",
          duration: 0.8,
          ease: "power3.out",
        }, SPLASH_TIMING.lettersAt);

        tl.to(wordRef.current, {
          x: -7,
          skewX: 7,
          duration: 0.045,
          yoyo: true,
          repeat: 5,
          ease: "steps(1)",
        }, SPLASH_TIMING.glitchAt);
        tl.fromTo(glitchARef.current, {
          autoAlpha: 0.95,
          x: 10,
          clipPath: "inset(8% 0 58% 0)",
        }, {
          autoAlpha: 0,
          x: -6,
          duration: 0.2,
          ease: "power1.out",
        }, SPLASH_TIMING.glitchAt);
        tl.fromTo(glitchBRef.current, {
          autoAlpha: 0.8,
          x: -8,
          clipPath: "inset(52% 0 6% 0)",
        }, {
          autoAlpha: 0,
          x: 5,
          duration: 0.18,
          ease: "power1.out",
        }, SPLASH_TIMING.glitchAt + 0.04);
        tl.fromTo(scanRef.current, { autoAlpha: 0, yPercent: -30 }, { autoAlpha: 1, duration: 0.12 }, SPLASH_TIMING.glitchAt);
        tl.to(scanRef.current, { yPercent: 560, autoAlpha: 0, duration: 0.62, ease: "power1.in" }, SPLASH_TIMING.glitchAt + 0.1);
        tl.fromTo(root.querySelector(".splash-sweep"), { xPercent: -180 }, {
          xPercent: 320,
          duration: 0.55,
          ease: "power2.inOut",
        }, SPLASH_TIMING.glitchAt + 0.05);

        if (chipsRef.current) {
          tl.to(chipsRef.current.children, {
            autoAlpha: 1,
            y: 0,
            duration: 0.36,
            stagger: 0.07,
            ease: "power3.out",
          }, SPLASH_TIMING.chipsAt);
        }
        tl.to(tagRef.current, { autoAlpha: 1, y: 0, duration: 0.42, ease: "power2.out" }, SPLASH_TIMING.tagAt);
        tl.to(kickerRef.current, { autoAlpha: 0, duration: 0.25 }, SPLASH_TIMING.tagAt);
        tl.fromTo(progressRef.current, { scaleX: 0 }, {
          scaleX: 1,
          duration: SPLASH_TIMING.exitAt,
          ease: "none",
        }, 0);

        tl.call(() => {
          allowParallax = false;
          if (parallaxRef.current) parallaxRef.current.style.transform = "translate3d(0,0,0)";
        }, [], SPLASH_TIMING.resolveAt - 0.08);

        tl.to([stageRef.current], {
          autoAlpha: 0,
          y: -18,
          duration: 0.38,
          ease: "power2.in",
        }, SPLASH_TIMING.resolveAt);
        tl.fromTo(flashRef.current, { opacity: 0.9 }, {
          opacity: 0,
          duration: 0.45,
          ease: "power2.out",
        }, SPLASH_TIMING.resolveAt);
        tl.to(logoRef.current, {
          autoAlpha: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.48,
          ease: "power3.out",
        }, SPLASH_TIMING.resolveAt + 0.02);

        tl.call(() => flyHome(finish), [], SPLASH_TIMING.exitAt);
      }
    } catch (error) {
      console.error(error);
      skip();
    }

    function flyHome(done: () => void) {
      armBackground();
      const logo = logoRef.current;
      const target = document.querySelector<HTMLImageElement>('header img[alt="Cybotz"]');
      gsap.to(bgRef.current, { opacity: 0, duration: SPLASH_TIMING.flight, ease: "power2.inOut" });
      gsap.to(skipRef.current, { autoAlpha: 0, duration: 0.18 });
      gsap.to(flashRef.current, { opacity: 0, duration: 0.2 });

      const land = () => {
        if (logo) gsap.set(logo, { autoAlpha: 0 });
        delete html.dataset.splash;
        done();
      };

      if (!logo || !target) {
        gsap.to(logo, { autoAlpha: 0, duration: 0.3, onComplete: land });
        return;
      }

      const from = logo.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      if (from.width < 2 || to.width < 2) {
        gsap.to(logo, { autoAlpha: 0, duration: 0.3, onComplete: land });
        return;
      }

      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const currentScale = Number(gsap.getProperty(logo, "scale")) || 1;
      gsap.to(logo, {
        x: `+=${dx}`,
        y: `+=${dy}`,
        scale: currentScale * (to.width / from.width),
        duration: SPLASH_TIMING.flight,
        ease: "power4.inOut",
        onComplete: land,
      });
    }

    return () => {
      closed = true;
      canvasRunning = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("keydown", onKey);
      root.removeEventListener("click", onRootClick);
      gsap.killTweensOf([
        root, bgRef.current, stageRef.current, logoRef.current, motion,
        wordRef.current, flashRef.current, progressRef.current, skipRef.current,
      ]);
      unlock();
    };
  }, []);

  const style = {
    "--splash-void": SPLASH_COLORS.void,
    "--splash-cyan": SPLASH_COLORS.cyan,
    "--splash-sky": SPLASH_COLORS.sky,
    "--splash-ink": SPLASH_COLORS.ink,
    "--splash-orange": SPLASH_COLORS.orange,
  } as React.CSSProperties;

  return createPortal(
    <div
      ref={rootRef}
      className="cybotz-splash"
      style={style}
      role="dialog"
      aria-modal="true"
      aria-label="Cybotz introduction"
    >
      <div ref={bgRef} className="splash-bg">
        <canvas ref={canvasRef} className="splash-canvas" aria-hidden="true" />
        <div className="splash-grid" aria-hidden="true" />
        <div className="splash-horizon" aria-hidden="true" />
        <div className="splash-vignette" aria-hidden="true" />
        <div className="splash-film" aria-hidden="true" />
        <i className="splash-corner splash-corner-tl" aria-hidden="true" />
        <i className="splash-corner splash-corner-tr" aria-hidden="true" />
        <i className="splash-corner splash-corner-bl" aria-hidden="true" />
        <i className="splash-corner splash-corner-br" aria-hidden="true" />
        <div className="splash-progress" aria-hidden="true">
          <span ref={progressRef} />
        </div>
      </div>

      <div ref={scanRef} className="splash-scanline" aria-hidden="true" />
      <div ref={flashRef} className="splash-flash" aria-hidden="true" />

      <div ref={parallaxRef} className="splash-parallax">
        <div ref={stageRef} className="splash-stage">
        <div aria-hidden="true" className="contents-lockup">
          <div ref={kickerRef} className="splash-kicker">
            <span className="splash-cursor" />
            Arming flight stack
          </div>
          <div className="splash-mark">
            <svg viewBox="0 0 160 160" fill="none" aria-hidden="true">
              <path ref={morphRef} className="splash-morph" d={morphPath(0, 0)} />
              <path className="splash-trace" d="M124 36H78c-20 0-34 14-34 34v20c0 20 14 34 34 34h46" />
              <path className="splash-trace" d="M78 36V18h36" />
              <path className="splash-trace" d="M78 124v18H48" />
              <path className="splash-trace" d="M44 80H22" />
              <path className="splash-trace" d="M124 36v16" />
              <path className="splash-trace" d="M124 124v-16" />
              <path className="splash-trace splash-trace-dim" d="M110 52H82c-12 0-20 8-20 20v16c0 12 8 20 20 20h28" />
              <path className="splash-trace splash-trace-dim" d="M110 52V40h14" />
              <path className="splash-trace splash-trace-dim" d="M62 80H50" />
              <circle className="splash-node" cx="114" cy="18" r="3.4" />
              <circle className="splash-node" cx="22" cy="80" r="3.4" />
              <circle className="splash-node" cx="48" cy="142" r="3.4" />
              <circle className="splash-node" cx="124" cy="52" r="2.7" />
              <circle className="splash-node" cx="124" cy="108" r="2.7" />
              <circle className="splash-node" cx="62" cy="80" r="2.5" />
            </svg>
          </div>
          <div ref={wordRef} className="splash-word">
            {WORD.map((letter, index) => (
              <span className="splash-mask" key={letter}>
                <span
                  className="splash-letter"
                  ref={(node) => {
                    if (node) lettersRef.current[index] = node;
                  }}
                >
                  {letter}
                </span>
              </span>
            ))}
            <span ref={glitchARef} className="splash-glitch splash-glitch-a">CYBOTZ</span>
            <span ref={glitchBRef} className="splash-glitch splash-glitch-b">CYBOTZ</span>
            <span className="splash-sweep" />
          </div>
          <div ref={chipsRef} className="splash-chips">
            {CHIPS.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
        </div>
        <p ref={tagRef} className="splash-tag">Building autonomous futures</p>
        </div>
      </div>

      <img
        ref={logoRef}
        className="splash-logo"
        src="/logos/cybotz_transparent.png"
        alt="Cybotz"
        draggable={false}
      />

      <button
        ref={skipRef}
        type="button"
        className="splash-skip"
        onClick={(event) => event.stopPropagation()}
      >
        Skip
      </button>
    </div>,
    document.body
  );
}
