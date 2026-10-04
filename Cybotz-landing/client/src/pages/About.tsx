import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MENTORS } from "@/data";
import { Rocket, ArrowRight } from "lucide-react";
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

  const timelineEvents = [
    {
      year: "2024",
      title: "FPV Demonstrations",
      desc: "Conducted high-speed drone demonstrations & FPV acrobatics, showcasing the power of custom-built aeronautical hardware."
    },
    {
      year: "2024",
      title: "School Bootcamps",
      desc: "Hosted workshops at leading Bangalore schools, introducing students to core electronics layouts and manual drone building."
    },
    {
      year: "2025",
      title: "Permanent Labs Setups",
      desc: "Expanded to setting up permanent Drone & Robotics Labs on campus, complete with soldering stations, batteries calibrating, and code bases."
    },
    {
      year: "2026",
      title: "Redefining STEM in India",
      desc: "Redefining STEM by partnering with leading schools to build thinkers—refusing AI shortcuts, play-kits, and pre-packaged templates."
    }
  ];

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
                  className="w-full sm:w-auto px-5 py-3 md:px-6 md:py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs md:text-sm tracking-wider rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_30px_rgba(0,240,255,0.7)] transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
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

        {/* TIMELINE ("Our Journey in Bangalore") */}
        <section className="py-20 border-t border-[#1E293B]/60 bg-[#0F172A]/15 backdrop-blur-sm">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="text-center mb-16">
              <span className="text-sm font-bold font-mono text-cyan-400 tracking-widest uppercase">Chronicle</span>
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-wider mt-2 mb-4">Our Journey in Bangalore</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-base">
                From FPV racing pilots to setting up permanent STEM labs across leading academies.
              </p>
            </div>

            <div className="relative border-l-2 border-slate-800 max-w-3xl mx-auto pl-6 md:pl-10 space-y-12">
              {timelineEvents.map((ev, index) => (
                <div key={index} className="relative">
                  {/* Timeline node */}
                  <span className="absolute -left-[31px] md:-left-[47px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F172A] border-2 border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.5)]" />

                  <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-950/20 border border-slate-800/40 backdrop-blur-sm hover:border-cyan-500/30 transition-all">
                    <span className="text-lg font-mono font-bold text-cyan-400">{ev.year}</span>
                    <h4 className="text-xl font-bold font-mono text-white">{ev.title}</h4>
                    <p className="text-gray-300 text-sm md:text-base leading-relaxed">{ev.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MEET THE HERO */}
        <section id="sec-team" className="py-20 md:py-24 bg-[#0B101D]/20 border-t border-[#1E293B]/60 backdrop-blur-sm">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <span className="text-sm font-bold font-mono text-cyan-400 tracking-widest uppercase">Leadership</span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-mono tracking-wider mt-2 mb-4">Meet the Hero</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-base md:text-lg">
                Learn directly from the FPV drone pilot and systems engineer driving the CYBOTZ mission.
              </p>
            </div>

            <div className="max-w-5xl xl:max-w-[1140px] mx-auto">
              {MENTORS.map((mentor, index) => (
                <div
                  key={index}
                  className="p-0 rounded-2xl bg-slate-950/30 backdrop-blur-md border border-slate-800/70 flex flex-col-reverse md:flex-row items-stretch justify-between overflow-hidden shadow-2xl group hover:border-cyan-500/40 transition-all duration-500"
                >
                  {/* Left Side: Text Description */}
                  <div className="p-8 md:p-10 lg:p-14 xl:p-16 md:w-7/12 lg:w-3/5 flex flex-col justify-center text-left space-y-6 lg:space-y-7 z-10 bg-slate-950/40 backdrop-blur-md">
                    <div>
                      <span className="inline-block px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs md:text-sm font-bold font-mono uppercase tracking-widest mb-3.5">
                        {mentor.role}
                      </span>
                      <h3 className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-bold font-mono text-white tracking-wide">
                        {mentor.name}
                      </h3>
                    </div>

                    <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-xl">
                      {mentor.bio}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3 md:gap-4 text-sm md:text-base font-mono text-cyan-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        FPV Drone Pilot
                      </span>
                      <span className="text-gray-600">•</span>
                      <span>20+ Custom Drones Built</span>
                      <span className="text-gray-600">•</span>
                      <span>Bangalore, India</span>
                    </div>
                  </div>

                  {/* Right Side: Prasanna's Photo scaled up & blended into background */}
                  <div className="relative md:w-5/12 lg:w-2/5 min-h-[340px] md:min-h-[440px] lg:min-h-[520px] xl:min-h-[550px] bg-black/40 flex items-center justify-center overflow-hidden">
                    {/* Seamless Blending Gradient Overlays */}
                    <div className="absolute inset-0 z-20 bg-gradient-to-t md:bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent pointer-events-none w-full h-full" />
                    <div className="absolute inset-0 z-20 bg-gradient-to-b from-transparent via-transparent to-slate-950/80 pointer-events-none w-full h-full" />

                    <LiquidGlassImage
                      src={mentor.image}
                      alt={mentor.name}
                      className="w-full h-full min-h-[340px] md:min-h-[440px] lg:min-h-[520px] xl:min-h-[550px]"
                      imgClassName="min-h-[340px] md:min-h-[440px] lg:min-h-[520px] xl:min-h-[550px] object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                </div>
              ))}
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
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 text-[#0F172A] font-bold font-mono text-sm tracking-wider rounded-lg hover:bg-cyan-400 transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer"
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
