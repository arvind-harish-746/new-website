import { useEffect, useRef, useState } from "react";

/**
 * Decorative flight-stack quad. SVG + CSS only — the page already runs a full-viewport
 * particle canvas, so a second WebGL context would cost mid-range phones a frame budget
 * they don't have. Rotors pause offscreen and while the splash still owns the GPU.
 */
export function DroneHud({ paused = false }: { paused?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "120px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`drone-hud drone-rig ${paused || !inView ? "is-paused" : ""}`}
      aria-hidden="true"
    >
      <div className="drone-corner tl" />
      <div className="drone-corner tr" />
      <div className="drone-corner bl" />
      <div className="drone-corner br" />
      <div className="drone-scanline" />

      <div className="drone-readout left">
        <span>FLT / QUAD</span>
        <strong>LINK · BANGALORE</strong>
        <span>MODE · HANDS-ON</span>
      </div>
      <div className="drone-readout right">
        <span>GRADES 5–12</span>
        <strong>RATIO 1:15</strong>
        <span>LAB · ACTIVE</span>
      </div>

      <svg className="drone-craft" viewBox="0 0 400 400">
        <circle cx="200" cy="200" r="168" className="radar-ring" />
        <circle cx="200" cy="200" r="128" className="radar-ring dim" />
        <circle cx="200" cy="200" r="86" className="radar-ring dim" />
        <g className="drone-sweep">
          <path d="M200 200 L200 42 A158 158 0 0 1 332 118 Z" className="sweep-wedge" />
        </g>
        <line x1="200" y1="28" x2="200" y2="372" className="crosshair" />
        <line x1="28" y1="200" x2="372" y2="200" className="crosshair" />

        <g className="airframe">
          <line x1="200" y1="200" x2="92" y2="92" className="arm" />
          <line x1="200" y1="200" x2="308" y2="92" className="arm" />
          <line x1="200" y1="200" x2="92" y2="308" className="arm" />
          <line x1="200" y1="200" x2="308" y2="308" className="arm" />
          <Rotor cx={92} cy={92} />
          <Rotor cx={308} cy={92} reverse />
          <Rotor cx={92} cy={308} reverse />
          <Rotor cx={308} cy={308} />
          <rect x="168" y="168" width="64" height="64" rx="14" className="fuselage" />
          <rect x="184" y="184" width="32" height="32" rx="6" className="deck" />
          <circle cx="200" cy="200" r="4" className="deck-core" />
        </g>
      </svg>
    </div>
  );
}

function Rotor({ cx, cy, reverse = false }: { cx: number; cy: number; reverse?: boolean }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r="34" className="rotor-disc" />
      <g className={reverse ? "drone-rotor reverse" : "drone-rotor"}>
        <ellipse rx="30" ry="7" />
        <ellipse rx="7" ry="30" />
      </g>
      <circle r="5" className="rotor-hub" />
    </g>
  );
}
