/** PCB trace that joins two home sections. Drawn with CSS scroll timelines where supported. */
export function SectionTrace() {
  return (
    <div className="home-trace" aria-hidden="true">
      <svg viewBox="0 0 1200 56" preserveAspectRatio="none">
        <path
          className="home-trace-path"
          pathLength={1}
          d="M0 30 C160 30 210 12 340 16 S560 42 720 24 S980 10 1200 28"
        />
        <circle className="trace-node" cx="340" cy="16" r="3.5" />
        <circle className="trace-node" cx="720" cy="24" r="3.5" />
        <circle className="trace-node" cx="1040" cy="18" r="3.5" />
        <circle className="trace-packet" r="4">
          <animateMotion
            dur="5.5s"
            repeatCount="indefinite"
            path="M0 30 C160 30 210 12 340 16 S560 42 720 24 S980 10 1200 28"
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
