/** PCB trace that joins two home sections. Drawn with CSS scroll timelines where supported. */
export function SectionTrace() {
  return (
    <div className="home-trace" aria-hidden="true">
      <svg viewBox="0 0 1200 56" preserveAspectRatio="none">
        <path
          className="home-trace-path"
          pathLength={1}
          d="M0 28 H260 L300 10 H560 L600 28 H860 L900 46 H1200"
        />
        <circle className="trace-node" cx="300" cy="10" r="4" />
        <circle className="trace-node" cx="600" cy="28" r="4" />
        <circle className="trace-node" cx="900" cy="46" r="4" />
        <circle className="trace-packet" r="4">
          <animateMotion
            dur="5.5s"
            repeatCount="indefinite"
            path="M0 28 H260 L300 10 H560 L600 28 H860 L900 46 H1200"
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
          d="M22 0 V140 H8 V300 H32 V480 H10 V680 H28 V860 H18 V1000"
        />
      </svg>
    </div>
  );
}
