import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { RobotHero } from "@/components/ui/robot-hero";
import {
  Terminal,
  Cpu,
  Gamepad2,
  Radio,
  History,
  Flame,
  Compass,
  Info,
  ArrowRight
} from "lucide-react";
import { useState } from "react";
import { PortalGalleryWindow } from "@/components/ui/infinite-drag-scroll";
import { LiquidGlassSlowNetworkBanner } from "@/components/ui/SkeletonLoader";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useLocation } from "wouter";

export default function Workshops() {
  const [, setLocation] = useLocation();
  const [activeTriviaId, setActiveTriviaId] = useState<string>("fpv");

  usePageMeta(
    "Workshops | Cybotz — Drone & Robotics Training",
    "Build drones, program robots, and master electronics in intensive hands-on workshops for schools across Bangalore."
  );

  const handleNavigate = (path: string) => {
    setLocation(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const curriculums = [
    {
      title: "Drone Building Workshop",
      target: "Middle School to Universities",
      summary: "Understand aerodynamics, assemble a fully functional quadcopter, calibrate settings, and learn manual flight on simulators and real hardware.",
      icon: Flame,
      syllabus: [
        { title: "Principles", desc: "Fundamentals of lift, thrust, and drag vectors." },
        { title: "Assembly", desc: "Building frame, motors, and ESCs layout." },
        { title: "Tuning", desc: "Telemetry registers & receiver pairing." },
        { title: "Simulation", desc: "Safe console piloting flight practice." },
        { title: "Operations", desc: "Real-world battery safety & manual hover flights." }
      ]
    },
    {
      title: "Raspberry Pi & Sensors",
      target: "Middle School to High School",
      summary: "Set up Raspberry Pi nodes, configure sensor registers (motion, temp, light), and program local WiFi remote controls and live video streaming feeds.",
      icon: Cpu,
      syllabus: [
        { title: "Setup", desc: "Operating System flashing & console configuration." },
        { title: "Electronics", desc: "Hooking up motion, temperature, & light sensors." },
        { title: "Logic", desc: "Register mapping & basic inputs reading." },
        { title: "WiFi Link", desc: "Direct desktop-to-robot control interfaces." },
        { title: "Camera", desc: "Launching streaming servers via camera ribbon." }
      ]
    },
    {
      title: "Scratch Coding & Robotics",
      target: "Primary to Middle School",
      summary: "For beginners to learn block-based logic, build interactive gaming nodes, read visual telemetry, and map drone sensor data feeds into Scratch panels.",
      icon: Gamepad2,
      syllabus: [
        { title: "Blocks Logic", desc: "Loop, conditional, and variable blocks." },
        { title: "Game Nodes", desc: "Designing custom controls for robot structures." },
        { title: "Animation", desc: "Interactive visual feedback & triggers." },
        { title: "Sensors Mapping", desc: "Reading accelerometer logs into Scratch." },
        { title: "Problems Solving", desc: "Devising algorithms in a visual canvas." }
      ]
    }
  ];

  const triviaLedger = [
    {
      id: "status",
      title: "SYSTEM STATUS",
      value: "ONLINE",
      icon: Radio,
      desc: "All nodes fully synchronized. Bootloader operations operational."
    },
    {
      id: "fpv",
      title: "FPV CAPABILITY",
      value: "300+ KM/H",
      icon: Flame,
      desc: "Fastest custom-built FPV drones can exceed speeds of 300 km/h in vertical ascents and acrobatics."
    },
    {
      id: "smallest-pi",
      title: "SMALLEST PI CHASSIS",
      value: "30MM x 65MM",
      icon: Cpu,
      desc: "The smallest fully functional Linux-capable Raspberry Pi computing node."
    },
    {
      id: "zephyr",
      title: "MAX ZEPHYR ENDURANCE",
      value: "64 DAYS",
      icon: Compass,
      desc: "Solar-powered autonomous drones have demonstrated staying airborne continuously in the stratosphere."
    },
    {
      id: "genesis",
      title: "DRONE GENESIS",
      value: "1917",
      icon: History,
      desc: "The first pilotless radio-controlled aircraft was successfully flown back in 1917 for early military testing."
    },
    {
      id: "unimate",
      title: "FIRST INDUSTRIAL ROBOT",
      value: "1961",
      icon: Terminal,
      desc: "Unimate, the world's first industrial robot, was installed on a General Motors assembly line in 1961."
    },
    {
      id: "robot-origin",
      title: "WORD ORIGIN",
      value: "ROBOTA (1920)",
      icon: Info,
      desc: "The term 'robot' originates from a 1920 Czech play 'R.U.R.' by Karel Čapek, meaning forced labor or drudgery."
    }
  ];

  const activeTrivia = triviaLedger.find(t => t.id === activeTriviaId) || triviaLedger[1];
  const ActiveIcon = activeTrivia.icon;

  return (
    <div className="relative text-[#102033] min-h-screen flex flex-col font-sans bg-[#F4F7FB]">
      {/* Elegant Dark Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none w-full h-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(5,117,206,0.08),transparent_55%),linear-gradient(#F4F7FB,#E7EEF6)]" />
      </div>

      {/* 3D RobotHero fixed background (placed on top of DarkGradientBg) */}
      <div className="fixed inset-0 z-[1] pointer-events-none w-full h-full">
        <RobotHero
          showUi={false}
          color="#0575CE"
          pantallaColor="#F97405"
          transparentBackground={true}
          roughness={0.25}
          metalness={0.2}
          baseOffsetX={0.65}
          baseOffsetY={0.05}
          scale={1.05}
        />
      </div>

      <Header />

      <main className="flex-grow pt-24 pb-16 relative z-10">

        {/* HERO SECTION */}
        <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden bg-transparent">
          {/* Mobile-only Ambient Radial Glow */}
          <div className="sm:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/15 rounded-full blur-[80px] pointer-events-none z-0" />

          <div className="container px-4 md:px-8 mx-auto relative z-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 sm:bg-transparent border border-cyan-400/40 sm:border-none text-[#0460A9] font-mono text-xs sm:text-sm tracking-widest uppercase mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse sm:hidden" />
                Cybotz Bootcamps
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-mono tracking-tight sm:tracking-wider text-[#102033] mb-4 sm:mb-6 leading-tight">
                Drone & Robotics <span className="text-[#0460A9] glow-cyan-text">Training Modules</span>
              </h1>
              <div className="p-3.5 sm:p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[#0460A9] font-mono text-xs sm:text-sm md:text-base tracking-wide sm:tracking-wider mb-4 sm:mb-6 max-w-xl backdrop-blur-sm">
                Over 90% of students successfully build and fly their own drones/robots by the end of the session!
              </div>
              <p className="text-[#3E5168] sm:text-[#3E5168] text-base sm:text-lg leading-relaxed mb-6">
                Step away from the simulator screen. Grab a soldering iron. Let’s build hardware that actually flies.
              </p>

              {/* Mobile-Only Feature Chips */}
              <div className="flex sm:hidden flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/85 border border-[#D5E0EA] text-xs font-mono text-[#0460A9]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  FPV Drone Piloting
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/85 border border-[#D5E0EA] text-xs font-mono text-[#0460A9]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Benchtop Soldering
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/85 border border-[#D5E0EA] text-xs font-mono text-[#0460A9]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  1-Day Bootcamps
                </span>
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-at-br from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
        </section>

        {/* CURRICULUMS */}
        <section className="py-20 border-t border-[#D5E0EA]/40 bg-transparent">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="text-center mb-16">
              <span className="text-sm font-bold font-mono text-[#0460A9] tracking-widest uppercase">Featured Packages</span>
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-wider mt-2 mb-4">Featured Curriculums</h2>
              <p className="text-[#3E5168] max-w-2xl mx-auto text-base">
                Our 1-Day intensive modular curriculums for school workshops and college bootcamps.
              </p>
            </div>

            <div className="space-y-12">
              {curriculums.map((curr, idx) => {
                const Icon = curr.icon;
                return (
                  <div
                    key={idx}
                    className="p-8 rounded-2xl bg-white/80 border border-[#D5E0EA] hover:border-cyan-500/40 backdrop-blur-md transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
                  >
                    {/* Left: Component Details (col-5) */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                      <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[#0460A9] flex items-center justify-center">
                        <Icon size={24} />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-[#102033] leading-tight">{curr.title}</h3>
                      <span className="text-xs font-bold font-mono text-[#0460A9] uppercase tracking-widest bg-cyan-500/5 px-2.5 py-1 rounded border border-cyan-500/10 self-start">
                        Target: {curr.target}
                      </span>
                      <p className="text-[#3E5168] text-base leading-relaxed mt-2">
                        {curr.summary}
                      </p>
                    </div>

                    {/* Right: Interactive Syllabus Outline (col-7) */}
                    <div className="lg:col-span-7 rounded-xl border border-[#D5E0EA] bg-white/70 backdrop-blur-sm p-6">
                      <h4 className="text-xs font-bold font-mono text-[#3E5168] uppercase tracking-wider mb-4 border-b border-[#D5E0EA] pb-2">
                        Syllabus Outline
                      </h4>
                      <div className="space-y-4">
                        {curr.syllabus.map((s, sIdx) => (
                          <div key={sIdx} className="flex gap-4 items-start">
                            <span className="text-xs font-mono text-[#0460A9] bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded flex-shrink-0 font-bold">
                              0{sIdx + 1}
                            </span>
                            <div>
                              <h5 className="font-bold text-[#102033] font-mono text-base">{s.title}</h5>
                              <p className="text-[#3E5168] text-sm leading-relaxed mt-0.5">{s.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SNEAK PEEK GALLERY WINDOW */}
        <section className="py-16 md:py-24 border-t border-[#D5E0EA] bg-[#E7EEF6]/40 backdrop-blur-sm relative overflow-hidden">
          <div className="w-full px-2 sm:px-4 md:px-8 max-w-[1440px] mx-auto">
            <div className="text-center mb-8">
              <span className="text-sm font-bold font-mono text-[#0460A9] tracking-widest uppercase">Action Reel</span>
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-wider mt-2 mb-3">
                Bootcamp Highlights
              </h2>
              <p className="text-[#3E5168] max-w-2xl mx-auto text-sm md:text-base">
                Real student pilot flights, coding marathons, obstacle arenas, and robotics engineering in action.
              </p>
            </div>

            <PortalGalleryWindow
              page="workshops"
              title="Here's a sneak peek into our workshops:"
              subtitle="Drag freely to explore FPV drone piloting, sensor breadboarding, and robotics racing"
            />
          </div>
        </section>

        {/* TRIVIA LEDGER (Interactive Dashboard) */}
        <section className="py-20 bg-transparent border-t border-[#D5E0EA]/40">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="text-center mb-16">
              <span className="text-sm font-bold font-mono text-[#0460A9] tracking-widest uppercase">Information Ledger</span>
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-wider mt-2 mb-4">Cybotz Trivia Ledger</h2>
              <p className="text-[#3E5168] max-w-2xl mx-auto text-base">
                Explore real aeronautical records, computer statistics, and hardware engineering facts.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-5xl mx-auto items-stretch">

              {/* Left Column: Selector list (col-5) */}
              <div className="lg:col-span-5 flex flex-col gap-2">
                {triviaLedger.map((t) => {
                  const Icon = t.icon;
                  const isActive = t.id === activeTriviaId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTriviaId(t.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-lg border font-mono text-sm tracking-wider transition-all duration-300 text-left cursor-pointer bg-transparent ${isActive
                          ? "border-cyan-500/50 bg-cyan-500/10 text-[#0460A9] font-bold shadow-[0_0_15px_rgba(5,117,206,0.08)]"
                          : "border-[#D5E0EA] hover:border-cyan-500/20 text-[#3E5168] hover:text-[#0460A9]"
                        }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={16} />
                        {t.title}
                      </span>
                      <span className={`text-xs ${isActive ? "text-[#0460A9] font-bold" : "text-gray-500"}`}>
                        {t.value}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Telemetry Monitor (col-7) */}
              <div className="lg:col-span-7 p-8 rounded-2xl border border-[#D5E0EA] bg-white/80 backdrop-blur-md flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                {/* Visual grid decor */}
                <div className="absolute inset-0 bg-grid-white/[0.01] pointer-events-none" />
                <div className="absolute top-4 right-4 text-gray-700 font-mono text-[10px]">MONITOR: RX_LINK</div>

                <div className="relative z-10 flex flex-col gap-6">
                  {/* Icon and title header */}
                  <div className="flex items-center gap-4 border-b border-[#D5E0EA] pb-4">
                    <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[#0460A9] flex items-center justify-center animate-pulse">
                      <ActiveIcon size={24} />
                    </div>
                    <div>
                      <span className="text-xs font-bold font-mono text-[#3E5168] uppercase tracking-widest">
                        Selected Ledger Entry
                      </span>
                      <h4 className="text-xl font-bold font-mono text-[#102033] tracking-wide mt-0.5">
                        {activeTrivia.title}
                      </h4>
                    </div>
                  </div>

                  {/* High neon telemetry value */}
                  <div>
                    <span className="text-xs font-bold font-mono text-[#3E5168] uppercase block mb-1">
                      Data Log
                    </span>
                    <span className="text-4xl md:text-5xl font-extrabold font-mono text-[#0460A9] tracking-wider glow-cyan-text block uppercase">
                      {activeTrivia.value}
                    </span>
                  </div>

                  {/* Fact description */}
                  <div>
                    <span className="text-xs font-bold font-mono text-[#3E5168] uppercase block mb-2">
                      Description & Analysis
                    </span>
                    <p className="text-[#3E5168] text-base md:text-lg leading-relaxed font-medium">
                      {activeTrivia.desc}
                    </p>
                  </div>
                </div>

                {/* Sub corner telemetry stats */}
                <div className="relative z-10 flex justify-between text-[11px] font-mono text-slate-400 border-t border-[#D5E0EA] pt-4 mt-8">
                  <span>CRC_CHECK: [OK]</span>
                  <span>TEL_SPEED: 57600bps</span>
                  <span>FLOW: COMPLETED</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* INTERNAL CROSS-LINK: Labs */}
        <section className="py-16 bg-transparent border-t border-[#D5E0EA]/40">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold font-mono tracking-wider mb-4">Want Something More Permanent?</h2>
              <p className="text-[#3E5168] mb-8 text-sm md:text-base">
                Set up a full-scale Drone & Robotics Lab at your campus with ongoing curriculum support and teacher training.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleNavigate("/labs")}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#F97405] text-[#102033] font-bold font-mono text-sm tracking-wider rounded-lg hover:bg-[#ff8614] transition-all duration-300 shadow-[0_8px_20px_rgba(249,116,5,0.18)] cursor-pointer"
                >
                  Explore Lab Setups <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => handleNavigate("/")}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-cyan-500 text-[#0460A9] font-bold font-mono text-sm tracking-wider rounded-lg hover:bg-cyan-500/10 transition-all duration-300 cursor-pointer"
                >
                  Book a Free Trial <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
      <LiquidGlassSlowNetworkBanner />
    </div>
  );
}
