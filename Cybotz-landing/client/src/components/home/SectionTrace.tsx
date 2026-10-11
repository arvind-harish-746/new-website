/** Oscilloscope the telemetry drone flies along. Decorative only. */
export function SectionTrace() {
  return (
    <div className="scope" aria-hidden="true">
      <svg viewBox="0 0 1200 220" preserveAspectRatio="none">
        <g className="scope-grid">
          {Array.from({ length: 7 }, (_, i) => (
            <line key={`h${i}`} x1="0" x2="1200" y1={20 + i * 30} y2={20 + i * 30} />
          ))}
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`v${i}`} y1="10" y2="210" x1={i * 100} x2={i * 100} />
          ))}
        </g>
        <path
          className="scope-wave"
          pathLength={1}
          d="M0 120 C80 120 90 40 160 48 S250 190 330 150 S430 30 520 70 S640 200 740 140 S860 24 960 80 S1080 170 1200 90"
        />
        <circle className="scope-packet" r="7">
          <animateMotion
            dur="6.5s"
            repeatCount="indefinite"
            path="M0 120 C80 120 90 40 160 48 S250 190 330 150 S430 30 520 70 S640 200 740 140 S860 24 960 80 S1080 170 1200 90"
          />
        </circle>
      </svg>
    </div>
  );
}

/** Full-height rail beside the story. Hidden on small screens. */
export function FlightRail() {
  return (
    <div className="home-rail" aria-hidden="true">
      <svg viewBox="0 0 40 1000" preserveAspectRatio="none">
        <path
          className="home-rail-path"
          pathLength={1}
          d="M20 0 C18 120 8 160 14 280 C22 420 34 460 16 620 C8 760 28 820 18 1000"
        />
      </svg>
    </div>
  );
}
