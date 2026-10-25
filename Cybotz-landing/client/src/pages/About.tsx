import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MENTORS } from "@/data";
import { Rocket, ArrowRight, Sparkles, Cpu, Award, MapPin } from "lucide-react";
import { StarfieldCanvas } from "@/components/ui/hyperdrive-hero";
import { LiquidGlassImage, LiquidGlassSlowNetworkBanner } from "@/components/ui/SkeletonLoader";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useLocation } from "wouter";
import type { Variants } from "framer-motion";
import { motion } from "framer-motion";

export default function About() {
  const [, setLocation] = useLocation();

  usePageMeta(
    "About Us | Cybotz — Our Mission & Team",
    "Meet the team behind Cybotz. Learn about our mission to redefine STEM education in Indian schools through hands-on drone and robotics training."
  );

  const handleNavigate = (path: string) => {
    setLocation(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fadeUpVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15 + 0.2,
        duration: 0.8,
        ease: "easeInOut",
      },
    }),
  };

  return (
    <div className="relative text-white min-h-screen flex flex-col font-sans bg-transparent">
      {/* Hyperdrive Starfield Background with interactive warp speed */}
      <div className="fixed inset-0 z-0 pointer-events-none w-full h-full">
        <StarfieldCanvas starColor="multi" baseSpeed={2} />
        {/* Refined subtle gradient overlays preserving high translucency for stars to shine through */}
        <div className="absolute inset-0 bg-[#0F172A]/15 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-[#0F172A]/20 to-[#0F172A]/50 pointer-events-none" />
      </div>

      <Header />

      <main className="flex-grow pt-24 pb-16 relative z-10">

        {/* HERO SECTION */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-28 relative overflow-hidden bg-transparent">
          {/* Mobile-only Ambient Radial Glow */}
          <div className="sm:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/15 rounded-full blur-[80px] pointer-events-none z-0" />

          <div className="container px-4 md:px-8 mx-auto relative z-10">
            <div className="max-w-3xl">
              <motion.div
                custom={0}
                variants={fadeUpVariants}
                initial="hidden"
                animate="visible"
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-cyan-950/70 sm:bg-cyan-500/10 border border-cyan-400/40 sm:border-cyan-500/30 text-cyan-300 sm:text-cyan-400 font-mono text-[11px] sm:text-xs md:text-sm uppercase tracking-wider mb-4 sm:mb-6 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.15)]"
              >
                <Rocket className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400" />
                <span>The Cybotz Mission</span>
              </motion.div>

              <motion.h1
                custom={1}
                variants={fadeUpVariants}
                initial="hidden"
                animate="visible"
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-mono tracking-tight sm:tracking-wider text-white mb-4 sm:mb-6 leading-tight"
              >
                Rewiring STEM &{" "}
                <span className="inline-block text-cyan-400 glow-cyan-text">Robotics Education</span>
              </motion.h1>

              <motion.p
                custom={2}
                variants={fadeUpVariants}
                initial="hidden"
                animate="visible"
                className="text-gray-300 text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed max-w-2xl mb-6 sm:mb-8"
              >
                We are a team of passionate engineers based in Bangalore dedicated to bringing raw, compromise-free engineering to schools.
              </motion.p>

              <motion.div
                custom={3}
                variants={fadeUpVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-xs sm:max-w-none"
              >
                <button
                  onClick={() => handleNavigate("/workshops")}
                  className="w-full sm:w-auto px-5 py-3 md:px-6 md:py-3.5 bg-[#F97405] hover:bg-[#ff8614] text-slate-950 font-bold font-mono text-xs md:text-sm tracking-wider rounded-lg shadow-[0_10px_24px_rgba(249,116,5,0.25)] glow-orange transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Explore Workshops <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById("sec-team");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full sm:w-auto px-5 py-3 md:px-6 md:py-3.5 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 font-bold font-mono text-xs md:text-sm tracking-wider rounded-lg transition-all duration-300 backdrop-blur-sm text-center cursor-pointer"
                >
                  Meet the Team
                </button>
              </motion.div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-radial-at-br from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
        </section>

        {/* PHILOSOPHY SECTION */}
        <section className="py-20 border-t border-[#1E293B]/60 bg-[#0B101D]/20 backdrop-blur-sm">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* The AI Shortcut Problem */}
              <div className="p-8 rounded-2xl bg-slate-950/25 border border-slate-800/60 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:border-rose-500/40 transition-all duration-300 flex flex-col gap-4">
                <div className="inline-flex items-center gap-2 text-rose-400 font-mono text-sm uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                  The AI Shortcut Problem
                </div>
                <h3 className="text-2xl font-bold font-mono text-white">Technological Consumers, Not Creators</h3>
                <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                  Today's students are surrounded by "smart blocks" and AI generators. They copy lines of code without compiling the underlying logic, prompting machines to write answers they don't understand. This results in a critical gap: when hardware fails, or custom sensors output raw noise, students lack the foundational engineering skills needed to troubleshoot. They have become tech consumers rather than creators.
                </p>
              </div>

              {/* Our Pedagogy */}
              <div className="p-8 rounded-2xl bg-slate-950/25 border border-slate-800/60 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:border-cyan-500/40 transition-all duration-300 flex flex-col gap-4">
                <div className="inline-flex items-center gap-2 text-cyan-400 font-mono text-sm uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
                  Our Pedagogy
                </div>
                <h3 className="text-2xl font-bold font-mono text-white">The Struggle is Where Learning Happens</h3>
                <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                  At Cybotz, we believe the struggle is where learning happens. We teach students how to calculate lift coefficients, assemble electronics from raw capacitors, and debug C/C++ compiler errors. No black boxes, no pre-packaged copy-pasting. We give young minds the exact microcontrollers, sensors, and tools that professional engineers use in modern tech industries.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* IMPACT METRICS */}
        <section className="py-16 bg-[#0B101D]/15 border-t border-[#1E293B]/60 backdrop-blur-sm">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              {[
                { count: "250+", label: "Students Mentored", desc: "Equipped with raw engineering fundamentals" },
                { count: "5", label: "Hosted Workshops", desc: "Active bootcamps conducted in Bangalore academies" },
                { count: "10+", label: "Drone Projects Built", desc: "Hand-assembled and flown by students from scratch" }
              ].map((m, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-xl bg-slate-950/25 border border-slate-800/60 backdrop-blur-md shadow-lg hover:border-cyan-500/40 transition-all duration-300 flex flex-col gap-2"
                >
                  <span className="text-4xl md:text-5xl font-extrabold font-mono text-cyan-400 tracking-wider glow-cyan-text">{m.count}</span>
                  <span className="font-bold text-white font-mono text-base">{m.label}</span>
                  <span className="text-gray-300 text-sm">{m.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MEET THE HERO & FOUNDING JOURNEY */}
        <section id="sec-team" className="py-16 md:py-24 bg-[#0B101D]/25 border-t border-[#1E293B]/60 backdrop-blur-sm relative overflow-hidden">
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

          {/* Dynamic Wide Container - scales fluidly with browser window aspect ratio up to 1800px */}
          <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 mx-auto relative z-10 max-w-[1800px]">
            {/* Header */}
            <div className="text-center mb-8 md:mb-10">
              <span className="text-xs sm:text-sm font-bold font-mono text-cyan-400 tracking-widest uppercase inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Leadership & Vision
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-mono tracking-wider mt-2.5 mb-2.5 text-white">
                Meet the <span className="text-cyan-400 glow-cyan-text">Hero</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base md:text-lg">
                The engineer and FPV flight architect driving the Cybotz mission from precision aerobatics to full-scale campus STEM labs.
              </p>
            </div>

            {/* EXPANDED MASTER HERO BENTO BOX - PANORAMIC WIDE ASPECT RATIO */}
            <div className="w-full mx-auto rounded-3xl bg-gradient-to-b from-[#0F172A]/85 via-[#0B101D]/90 to-[#070C16] border border-cyan-500/30 p-5 sm:p-7 md:p-8 lg:p-8 xl:p-8 2xl:p-10 shadow-[0_25px_65px_rgba(0,0,0,0.7)] backdrop-blur-xl relative overflow-hidden">
              {/* Top Accent Glowing Border */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

              {/* Main Panoramic Grid:
                  - xl+ (Wide Screens): 3 columns side-by-side (Col 1: Story, Col 2: Portrait, Col 3: Milestones feed)
                    Result: Wide panoramic aspect ratio (~3:1), height capped and compact, NOT long!
                  - lg: 2 columns top (Story + Photo) and 4-column compact ribbon bottom
                  - sm/md/mobile: Adaptive stack
              */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-6 2xl:gap-8 items-stretch">
                {/* Column 1: Founder Story, Vision Quote & Credentials */}
                <div className="lg:col-span-7 xl:col-span-5 2xl:col-span-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold font-mono uppercase tracking-widest mb-2.5 shadow-sm">
                      <Sparkles size={12} className="text-cyan-400 animate-pulse" />
                      Founder & FPV Drone Pilot
                    </div>
                    <h3 className="text-2xl sm:text-3xl xl:text-4xl 2xl:text-5xl font-bold font-mono text-white tracking-wide">
                      Prasanna
                    </h3>
                  </div>

                  {/* Vision Quote Box */}
                  <div className="relative p-3.5 sm:p-4 rounded-xl bg-cyan-950/30 border-l-4 border-cyan-400 border border-cyan-500/20 shadow-inner">
                    <p className="font-mono text-sm sm:text-base xl:text-base 2xl:text-lg text-cyan-200 font-semibold leading-snug">
                      “From a Passion for Robotics to Transforming STEM Education”
                    </p>
                  </div>

                  {/* Narrative Bio */}
                  <div className="space-y-2.5 text-gray-300 text-xs sm:text-sm xl:text-[13.5px] 2xl:text-[15px] leading-relaxed">
                    <p>
                      Cybotz Technologies was founded by <strong className="text-white">Prasanna</strong>, an FPV drone pilot and robotics enthusiast, with a vision to bring real, authentic STEM learning into schools.
                    </p>
                    <p>
                      With direct experience building <span className="text-cyan-300 font-semibold">20+ custom high-performance drones</span>, consulting for multiple drone startups, and conducting high-speed aerobatic flight shows, he realized the critical need for authentic, hands-on education rather than passive screen time or pre-assembled plastic kits.
                    </p>
                    <p className="text-gray-400 text-xs xl:text-xs 2xl:text-sm">
                      Today, he leads Cybotz across Bangalore, designing complete campus robotics ecosystems where students learn physics, telemetry, motor dynamics, and circuits from first principles.
                    </p>
                  </div>

                  {/* Quick Badges / Metrics */}
                  <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs font-mono text-cyan-300">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-cyan-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      FPV Drone Pilot
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-cyan-500/30">
                      <Cpu size={13} className="text-cyan-400" />
                      20+ Custom Drones
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-cyan-500/30">
                      <Award size={13} className="text-cyan-400" />
                      Startup Consultant
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-cyan-500/30">
                      <MapPin size={13} className="text-cyan-400" />
                      Bangalore, India
                    </span>
                  </div>
                </div>

                {/* Column 2: Illuminated Portrait Showcase */}
                <div className="lg:col-span-5 xl:col-span-3 2xl:col-span-3 flex justify-center items-center">
                  <div className="relative w-full max-w-[340px] xl:max-w-none h-full min-h-[360px] sm:min-h-[400px] xl:min-h-[440px] max-h-[480px] rounded-2xl p-2.5 bg-gradient-to-b from-cyan-500/30 via-slate-800/40 to-slate-950 border border-cyan-500/40 shadow-[0_15px_45px_rgba(0,240,255,0.2)] group flex flex-col">
                    {/* Ambient glow behind card */}
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-transparent rounded-2xl blur-xl pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />

                    {/* Image Container with crisp lighting and NO black overlays */}
                    <div className="relative w-full flex-1 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/60 min-h-[300px]">
                      <LiquidGlassImage
                        src="/images/prasanna_portrait.jpg"
                        alt="Prasanna - Founder of Cybotz"
                        className="w-full h-full"
                        imgClassName="w-full h-full object-cover object-top filter brightness-[1.08] contrast-[1.05] transition-transform duration-700 group-hover:scale-105"
                        showSlowNetworkBadge={false}
                      />

                      {/* Floating Top Pill Badge */}
                      <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/40 text-cyan-300 font-mono text-[10px] sm:text-[11px] font-bold shadow-lg flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Lead Pilot
                      </div>

                      {/* Bottom Name Card Bar */}
                      <div className="absolute bottom-3 inset-x-3 z-20 p-2.5 sm:p-3 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-800/80 shadow-2xl flex items-center justify-between">
                        <div>
                          <div className="text-white font-mono font-bold text-sm sm:text-base tracking-wide">Prasanna</div>
                          <div className="text-cyan-400 font-mono text-[11px]">Systems Architect & Pilot</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
                          CYBOTZ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Founding Journey Feed */}
                <div className="lg:col-span-12 xl:col-span-4 2xl:col-span-4 flex flex-col justify-between pt-6 lg:pt-6 xl:pt-0 border-t lg:border-t xl:border-t-0 xl:border-l border-slate-800/80 xl:pl-6 2xl:pl-8">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                        Founding Journey
                      </span>
                      <h4 className="text-base sm:text-lg xl:text-base 2xl:text-lg font-bold font-mono text-white mt-0.5">
                        From Flight Demos to STEM Labs
                      </h4>
                    </div>
                    <span className="text-[10px] sm:text-xs font-mono text-gray-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      2024 — Present
                    </span>
                  </div>

                  {/* Responsive Milestones Feed:
                      - xl+: vertical feed matching story & portrait height
                      - lg: 4 columns across bottom
                      - sm: 2x2 grid
                      - mobile: 1 column stack
                  */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-1 gap-2.5 sm:gap-3 flex-1 justify-between">
                    {/* Milestone 1 */}
                    <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-center group/m">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-[11px]">
                            2024
                          </span>
                          <span className="text-xs sm:text-sm font-mono font-semibold text-white group-hover/m:text-cyan-300 transition-colors">
                            FPV Demonstrations
                          </span>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover/m:scale-125 transition-transform shrink-0" />
                      </div>
                      <p className="text-gray-300 text-[11px] sm:text-xs leading-relaxed">
                        Conducted high-speed drone demonstrations & aerobatics, proving custom-built aerodynamic hardware under extreme stress.
                      </p>
                    </div>

                    {/* Milestone 2 */}
                    <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-center group/m">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-[11px]">
                            2024
                          </span>
                          <span className="text-xs sm:text-sm font-mono font-semibold text-white group-hover/m:text-cyan-300 transition-colors">
                            School Workshops
                          </span>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover/m:scale-125 transition-transform shrink-0" />
                      </div>
                      <p className="text-gray-300 text-[11px] sm:text-xs leading-relaxed">
                        Hosted workshops at schools, introducing students to hands-on drone-building, soldering circuits, and fundamental robotics.
                      </p>
                    </div>

                    {/* Milestone 3 */}
                    <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-center group/m">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-[11px]">
                            2025
                          </span>
                          <span className="text-xs sm:text-sm font-mono font-semibold text-white group-hover/m:text-cyan-300 transition-colors">
                            Permanent Labs
                          </span>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover/m:scale-125 transition-transform shrink-0" />
                      </div>
                      <p className="text-gray-300 text-[11px] sm:text-xs leading-relaxed">
                        Expanded to setting up permanent Drone & Robotics Labs across schools with real testing benches, telemetry, and tools.
                      </p>
                    </div>

                    {/* Milestone 4 */}
                    <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-[#F97405]/50 transition-all duration-300 flex flex-col justify-center group/m">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#F97405]/15 border border-[#F97405]/40 text-[#F97405] font-mono font-bold text-[11px]">
                            2025+
                          </span>
                          <span className="text-xs sm:text-sm font-mono font-semibold text-white group-hover/m:text-orange-300 transition-colors">
                            Transforming STEM
                          </span>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F97405] group-hover/m:scale-125 transition-transform shrink-0" />
                      </div>
                      <p className="text-gray-300 text-[11px] sm:text-xs leading-relaxed">
                        Partnering with leading academic institutions to redefine STEM education in India through raw hardware mastery.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INTERNAL CROSS-LINKS CTA */}
        <section className="py-16 bg-[#0B101D]/20 backdrop-blur-sm border-t border-[#1E293B]/60">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold font-mono tracking-wider mb-4">Ready to See Us in Action?</h2>
              <p className="text-gray-400 mb-8 text-sm md:text-base">
                Explore our programs and see how we're transforming classrooms into engineering labs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleNavigate("/workshops")}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#F97405] text-slate-950 font-bold font-mono text-sm tracking-wider rounded-lg hover:bg-[#ff8614] transition-all duration-300 shadow-[0_8px_20px_rgba(249,116,5,0.25)] glow-orange cursor-pointer"
                >
                  Explore Workshops <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => handleNavigate("/labs")}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-cyan-500 text-cyan-400 font-bold font-mono text-sm tracking-wider rounded-lg hover:bg-cyan-500/10 transition-all duration-300 cursor-pointer"
                >
                  Setup a Lab <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => handleNavigate("/blogs")}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-700 text-gray-300 font-bold font-mono text-sm tracking-wider rounded-lg hover:border-cyan-500/50 hover:text-cyan-400 transition-all duration-300 cursor-pointer"
                >
                  Read Our Blog <ArrowRight size={16} />
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
