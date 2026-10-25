import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  ShieldCheck,
  XCircle,
  Cpu,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Hammer,
  Navigation,
  ArrowRight
} from "lucide-react";
import { useState } from "react";
import WireTerrain from "@/components/ui/wire-terrain";
import { PortalGalleryWindow } from "@/components/ui/infinite-drag-scroll";
import { LiquidGlassSlowNetworkBanner } from "@/components/ui/SkeletonLoader";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useLocation } from "wouter";

export default function Labs() {
  const [, setLocation] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  usePageMeta(
    "Labs | Cybotz — Permanent STEM Lab Setup",
    "Transform your school with a permanent drone & robotics lab. Full curriculum, equipment, and instructor training included."
  );

  const handleNavigate = (path: string) => {
    setLocation(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const curriculumLevels = [
    {
      level: "Level 1",
      title: "The Foundation",
      duration: "Months 1 to 3",
      topic: "Hardware & Circuits",
      focus: "Understanding the Basics: Electronics & Logic Development from scratch, bypassing ready-made play blocks.",
      icon: Cpu,
      syllabus: [
        "Basics of electronics, sensors, and microcontrollers.",
        "Understanding motors, batteries, and wiring from scratch.",
        "Programming microcontrollers (Arduino) for automation.",
        "Learning problem-solving techniques through real-life scenarios."
      ]
    },
    {
      level: "Level 2",
      title: "Build & Code",
      duration: "Months 4 to 6",
      topic: "Autonomous Ground Vehicles",
      focus: "Learn to build and code functional robots. Assembling robotic chassis using open-source hardware components.",
      icon: Hammer,
      syllabus: [
        "Assembling structures using open-source parts (no kits).",
        "Programming automation systems with Python & C++.",
        "Developing movement, motor drivers, and sensor feedback logic.",
        "Project: A robot responding to external light/sound/motion stimuli."
      ]
    },
    {
      level: "Level 3",
      title: "Take Flight",
      duration: "Months 7 to 9",
      topic: "Aerospace Dynamics",
      focus: "Build & control a real FPV drone. Understanding aerodynamics, throttle mappings, and telemetry loops.",
      icon: Navigation,
      syllabus: [
        "Understanding aerodynamics and quadcopter physics.",
        "Building drone frame, soldering motors, and ESC units.",
        "Coding flight control logic with Python & C++.",
        "Hands-on flight training, telemetry tuning, & troubleshooting."
      ]
    }
  ];

  const faqs = [
    {
      q: "How does this lab differ from other robotics programs?",
      a: "We reject pre-built toy kits and block-based masking code. Students learn custom circuit structures, C++ pinout configurations, and flight telemetry loops from the ground up."
    },
    {
      q: "What equipment is required for school setups?",
      a: "All that is required is basic classroom table space, computers, and a projector. Cybotz coordinates and supplies all microcontrollers, soldering stations, components, and safety kits."
    },
    {
      q: "How long does the mentorship program last?",
      a: "We offer continuous long-term mentorship throughout the academic year. Our engineering trainers visit your school weekly to guide students through the structured 9-month curriculum."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="relative text-white min-h-screen flex flex-col font-sans bg-transparent">
      {/* Wire Terrain Cyber Canyon Background */}
      <div className="fixed inset-0 z-0 pointer-events-none w-full h-full overflow-hidden">
        <WireTerrain
          background="#060A13"
          lineColor="#11B3D9"
          accent="#00A3FF"
          relief={98}
          sunSize={84}
          cameraHeight={63}
          speed={90}
          density={115}
          hover={180}
          globalPointer={true}
        />
        {/* Soft vignette & gradient overlay to preserve optimal contrast for text & cards */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#060A13]/40 via-[#0B101D]/25 to-[#060A13]/85 pointer-events-none" />
      </div>

      <Header />

      <main className="flex-grow pt-24 pb-16 relative z-10">

        {/* HERO SECTION */}
        <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden bg-[#0B101D]/20 backdrop-blur-sm">
          {/* Mobile-only Ambient Radial Glow */}
          <div className="sm:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/15 rounded-full blur-[80px] pointer-events-none z-0" />

          <div className="container px-4 md:px-8 mx-auto relative z-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 sm:bg-transparent border border-cyan-400/40 sm:border-none text-cyan-400 font-mono text-xs sm:text-sm tracking-widest uppercase mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse sm:hidden" />
                Permanent Campus Labs
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-mono tracking-tight sm:tracking-wider text-white mb-4 sm:mb-6 leading-tight">
                Building Thinkers, <span className="text-cyan-400 glow-cyan-text">Not Just Robots</span>
              </h1>
              <p className="text-gray-300 sm:text-gray-400 text-base sm:text-lg leading-relaxed mb-6">
                Hands-on STEM labs focusing on real-world problem-solving, core fundamentals, and independent thinking—no shortcuts, no gimmicks.
              </p>

              {/* Mobile-Only Feature Chips */}
              <div className="flex sm:hidden flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-cyan-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Hardware-First
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-cyan-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Zero AI Gimmicks
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-cyan-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  9-Month Path
                </span>
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-at-br from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
        </section>

        {/* CURRICULUM LEVEL CARDS */}
        <section className="py-20 border-t border-[#1E293B]/60 bg-[#0F172A]/20 backdrop-blur-sm">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="text-center mb-16">
              <span className="text-sm font-bold font-mono text-cyan-400 tracking-widest uppercase">Progressive Learning</span>
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-wider mt-2 mb-4">Detailed Curriculum Outline</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-base">
                A structured 9-month program taking students from foundational circuits to complex aerospace telemetry.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {curriculumLevels.map((lvl, index) => {
                const Icon = lvl.icon;
                return (
                  <div
                    key={index}
                    className="p-5 sm:p-8 rounded-2xl bg-slate-950/25 border border-slate-800/60 hover:border-cyan-500/40 backdrop-blur-md transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Badge / Timeline Header */}
                      <div className="flex justify-between items-center mb-6">
                        <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-sm font-bold rounded-md">
                          {lvl.level}
                        </span>
                        <span className="text-sm text-gray-400 font-mono font-bold uppercase">{lvl.duration}</span>
                      </div>

                      {/* Header */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-white font-mono text-xl">{lvl.title}</h3>
                          <span className="text-sm text-cyan-400/90 font-mono font-medium">{lvl.topic}</span>
                        </div>
                      </div>

                      {/* Focus Description */}
                      <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-6 font-semibold border-l-2 border-cyan-500/30 pl-3">
                        {lvl.focus}
                      </p>

                      {/* Syllabus Items */}
                      <ul className="space-y-3 mb-6 text-gray-300 text-sm md:text-base">
                        {lvl.syllabus.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SNEAK PEEK GALLERY WINDOW */}
        <section className="py-16 md:py-24 border-t border-[#1E293B]/60 bg-[#070B14]/40 backdrop-blur-sm relative overflow-hidden">
          <div className="w-full px-2 sm:px-4 md:px-8 max-w-[1440px] mx-auto">
            <div className="text-center mb-8">
              <span className="text-sm font-bold font-mono text-cyan-400 tracking-widest uppercase">Visual Archive</span>
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-wider mt-2 mb-3">
                Live Lab Operations
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
                Take an interactive tour inside our active makerspaces, hardware benches, and real drone test flights.
              </p>
            </div>

            <PortalGalleryWindow
              page="labs"
              title="Here's a sneak peek into our labs:"
              subtitle="Drag freely to explore ESC soldering, carbon-fiber drone assemblies, and telemetry tuning"
            />
          </div>
        </section>

        {/* COMPARISON: HOW WE DIFFER */}
        <section className="py-20 bg-[#0B101D]/20 border-t border-[#1E293B]/60 backdrop-blur-sm">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="text-center mb-16">
              <span className="text-sm font-bold font-mono text-cyan-400 tracking-widest uppercase">The Comparison</span>
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-wider mt-2 mb-4">How We Differ</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-base">
                Compare our rigorous, industry-aligned training method against the standard educational shortcuts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">

              {/* The Cybotz Way */}
              <div className="p-8 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md shadow-[0_0_25px_rgba(0,240,255,0.05)]">
                <h3 className="text-2xl font-bold font-mono text-cyan-400 flex items-center gap-3 mb-6">
                  <ShieldCheck size={26} /> The Cybotz Way
                </h3>
                <ul className="space-y-6">
                  {[
                    {
                      title: "Teach Real Coding & Electronics",
                      desc: "Every line of code is written by students, compiling and uploading directly to microcontrollers."
                    },
                    {
                      title: "Mentor Students Year-Round",
                      desc: "Weekly hands-on lab sessions to systematically build progressive engineering capabilities."
                    },
                    {
                      title: "Encourage Troubleshooting",
                      desc: "Students learn to analyze circuit noise, solder ESC connections, and debug compiler errors manually."
                    },
                    {
                      title: "Limit Batch Sizes",
                      desc: "Strictly limited to 30 students per instructor to ensure safety and quality mentoring."
                    }
                  ].map((item, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-white font-mono text-base mb-1">{item.title}</h4>
                        <p className="text-gray-300 text-sm md:text-base leading-relaxed">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Standard Market Gimmicks */}
              <div className="p-8 rounded-2xl border border-rose-500/20 bg-rose-500/10 backdrop-blur-md">
                <h3 className="text-2xl font-bold font-mono text-rose-500 flex items-center gap-3 mb-6">
                  <XCircle size={26} /> Market Gimmicks
                </h3>
                <ul className="space-y-6">
                  {[
                    {
                      title: "Ready-Made Templates",
                      desc: "Copy-pasting AI-generated files or using drag-and-drop packages that skip cognitive development."
                    },
                    {
                      title: "One-Time Flashy Shows",
                      desc: "Conducting one-off drone shows or single-day events without leaving active knowledge behind."
                    },
                    {
                      title: "Handing Out Prefab Solutions",
                      desc: "Providing pre-assembled blocks where troubleshooting is impossible and error codes are hidden."
                    },
                    {
                      title: "Overcrowded Batches",
                      desc: "Cramming 100+ students in a single lecture room, eliminating any practical instructor oversight."
                    }
                  ].map((item, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] mt-2.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-white font-mono text-base mb-1">{item.title}</h4>
                        <p className="text-gray-300 text-sm md:text-base leading-relaxed">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-20 border-t border-[#1E293B]/60 bg-[#0F172A]/20 backdrop-blur-sm">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="text-center mb-16">
              <span className="text-sm font-bold font-mono text-cyan-400 tracking-widest uppercase">FAQ</span>
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-wider mt-2 mb-4">Frequently Asked Questions</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-base">
                Find answers to common queries regarding lab infrastructure, setup requirements, and timeline scopes.
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-800/60 bg-[#0B101D]/20 backdrop-blur-sm overflow-hidden transition-all duration-300"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full flex items-center justify-between p-5 text-left font-mono font-bold text-sm md:text-base text-white hover:text-cyan-400 transition-colors cursor-pointer bg-transparent border-none"
                    >
                      <span className="flex items-center gap-3">
                        <HelpCircle size={18} className="text-cyan-500 flex-shrink-0" />
                        {faq.q}
                      </span>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-gray-300 text-sm md:text-base leading-relaxed border-t border-slate-800/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* INTERNAL CROSS-LINK: Workshops */}
        <section className="py-16 bg-[#0B101D]/20 backdrop-blur-sm border-t border-[#1E293B]/60">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold font-mono tracking-wider mb-4">Not Ready for a Full Lab Yet?</h2>
              <p className="text-gray-400 mb-8 text-sm md:text-base">
                Start with an intensive workshop to give your students a taste of real-world STEM before committing to a permanent setup.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleNavigate("/workshops")}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#F97405] text-slate-950 font-bold font-mono text-sm tracking-wider rounded-lg hover:bg-[#ff8614] transition-all duration-300 shadow-[0_8px_20px_rgba(249,116,5,0.25)] glow-orange cursor-pointer"
                >
                  Explore Workshops <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => handleNavigate("/")}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-cyan-500 text-cyan-400 font-bold font-mono text-sm tracking-wider rounded-lg hover:bg-cyan-500/10 transition-all duration-300 cursor-pointer"
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
