import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AetherFlowHero from "@/elements/ather_bg";
import { Calendar } from "@/elements/calendar";
import CybotzTerminal from "@/components/CybotzTerminal";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Send,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Shield,
  Layers,
  Zap,
  Globe,
  School,
  CheckCircle,
  FileCode2
} from "lucide-react";
import { INSTITUTIONS } from "@/data";
import { captureUtmParams } from "@/lib/utm";
import { usePageMeta } from "@/hooks/usePageMeta";
import { LiquidGlassImage, LiquidGlassSlowNetworkBanner } from "@/components/ui/SkeletonLoader";
import { useSplashGate } from "@/components/SplashScreen";
import { FlightRail, SectionTrace } from "@/components/home/SectionTrace";
import { useHomeMotion } from "@/components/home/useHomeMotion";

interface ContactFormData {
  name: string;
  school: string;
  email: string;
  message: string;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { suspendBackground } = useSplashGate();
  const splashCoveredOnLoad = useRef(suspendBackground).current;
  const [accentPlay, setAccentPlay] = useState(false);

  useHomeMotion(!suspendBackground);

  useEffect(() => {
    if (suspendBackground) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setAccentPlay(true), splashCoveredOnLoad ? 160 : 80);
    return () => window.clearTimeout(id);
  }, [suspendBackground, splashCoveredOnLoad]);

  usePageMeta(
    "Cybotz | Empowering Young Minds with Real-World STEM Skills",
    "Hands-on Drone, Electronics, and Robotics training for schools in Bangalore. 100% practical learning — no AI shortcuts, no play-kits."
  );


  // Contact Form State
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    school: "",
    email: "",
    message: ""
  });
  const [formErrors, setFormErrors] = useState<{ name?: string; school?: string; email?: string; message?: string }>({});
  const [formSubmitted, setFormSubmitted] = useState(false);


  // Listen to custom calendar date selection event
  useEffect(() => {
    const handleDateSelect = (e: Event) => {
      const day = (e as CustomEvent).detail;
      const month = new Date().toLocaleString("default", { month: "long" });
      const year = new Date().getFullYear();

      setFormData((prev: ContactFormData) => {
        // Replace previous date string if user selects a different date
        const baseMessage = prev.message.replace(/^I would like to book a free trial session on .*\n\n/i, "");
        return {
          ...prev,
          message: `I would like to book a free trial session on ${month} ${day}, ${year}.\n\n${baseMessage}`
        };
      });

      // Smooth scroll to the form input
      const formEl = document.getElementById("form-name");
      if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth" });
        formEl.focus();
      }
    };

    window.addEventListener("cybotz-date-select", handleDateSelect);
    return () => window.removeEventListener("cybotz-date-select", handleDateSelect);
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; school?: string; email?: string; message?: string } = {};

    if (!formData.name.trim()) errors.name = "Please enter your name.";
    if (!formData.school.trim()) errors.school = "Please enter your school or organization name.";
    if (!formData.email.trim() || !formData.email.includes("@")) errors.email = "Please enter a valid email address.";
    if (!formData.message.trim()) errors.message = "Please enter your inquiry details.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setFormSubmitted(true);

    const utmData = captureUtmParams();
    const utmText = Object.keys(utmData).length > 0 ? `\n\n[Marketing Ref: ${JSON.stringify(utmData)}]` : "";

    const subject = encodeURIComponent(`[Cybotz Consultation] Inquiry from ${formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\nInstitution/School: ${formData.school}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}${utmText}`
    );
    window.location.href = `mailto:info@cybotz.tech?subject=${subject}&body=${body}`;
  };

  const handlePageNavigation = (path: string) => {
    setLocation(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="home-stage relative text-white min-h-screen flex flex-col font-sans selection:bg-[#F97405] selection:text-slate-900 bg-transparent">
      {/* Fixed background animating AetherFlowHero behind all content */}
      <div className="fixed inset-0 z-0 pointer-events-none w-full h-full">
        <AetherFlowHero showContent={false} densityMultiplier={2.8} suspended={suspendBackground} />
        {/* Transparent overlays to ensure text readability while letting dense aether shine through */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/40 via-transparent to-[#0F172A]/70" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-[#0F172A]/20 to-[#0F172A]/70" />
      </div>

      <Header />

      <main className="flex-grow relative z-10">
        <FlightRail />
        {/* HERO SECTION */}
        <section id="sec-hero" className="relative min-h-[100dvh] flex items-center justify-center pt-16 pb-8 sm:pt-20 sm:pb-12 overflow-visible">
          {/* Subtle overlay over hero section */}
          <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/30 via-transparent to-[#0F172A]/70" />
          </div>

          {/* Mobile-only Ambient Radial Glow to eliminate black dead space */}
          <div className="sm:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-cyan-500/20 rounded-full blur-[90px] pointer-events-none z-0" />
          <div className="sm:hidden absolute bottom-12 left-1/2 -translate-x-1/2 w-60 h-40 bg-blue-600/15 rounded-full blur-[80px] pointer-events-none z-0" />

          <div className="container px-4 md:px-8 relative z-10 mx-auto">
            <motion.div
              initial={splashCoveredOnLoad ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={splashCoveredOnLoad ? { duration: 0 } : {
                duration: 0.85,
                delay: 0.12,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="hero-layout"
            >
              <div className="hero-lead">
              {/* Tagline Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-cyan-950/70 sm:bg-cyan-500/10 border border-cyan-400/40 sm:border-cyan-500/30 text-cyan-300 sm:text-cyan-400 font-mono text-xs sm:text-sm md:text-base uppercase tracking-wider shadow-[0_0_15px_rgba(0,240,255,0.2)] sm:shadow-none">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                No shortcuts, Just Hands-on Learning!
              </div>

              {/* Headline (Responsive sizing & no awkward hyphen breakage on mobile) */}
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight sm:tracking-wider leading-tight sm:leading-tight font-mono text-white max-w-3xl">
                Empower Young Minds with{" "}
                <KineticAccent text="Real-World STEM Skills" play={accentPlay} />
              </h1>

              {/* Sub-headline */}
              <p className="text-gray-300 sm:text-gray-400 text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed lg:px-0 px-2">
                Give your students the edge they deserve by mastering raw engineering fundamentals from the ground up.
              </p>
              </div>

              <div className="hero-craft w-full hidden md:block">
                <div className="hero-flight-slot" aria-hidden="true" />
              </div>

              <div className="hero-actions relative z-50">

              {/* Mobile-Only Feature / Stat Pills */}
              <div className="flex sm:hidden flex-wrap items-center justify-center gap-2 max-w-sm mt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-cyan-300 backdrop-blur-sm">
                  <Zap size={13} className="text-cyan-400" />
                  <span>100% Practical</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-cyan-300 backdrop-blur-sm">
                  <Shield size={13} className="text-cyan-400" />
                  <span>1:15 Mentorship</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-cyan-300 backdrop-blur-sm">
                  <Cpu size={13} className="text-cyan-400" />
                  <span>Zero Play-Kits</span>
                </div>
              </div>

              {/* DESKTOP CTAs */}
              <div className="hidden sm:flex flex-row items-center gap-3.5 mt-6">
                <a
                  href="#sec-contact"
                  onClick={(e) => {
                    e.preventDefault();
                    document.documentElement.classList.remove("cybotz-splash-lock");
                    const target = document.getElementById("sec-contact") || document.getElementById("reach-us");
                    if (target) {
                      target.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className="whitespace-nowrap inline-flex items-center justify-center px-7 py-3.5 bg-[#F97405] hover:bg-[#ff8614] text-slate-950 font-bold font-mono text-sm tracking-wider rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_10px_24px_rgba(249,116,5,0.22)] glow-orange cursor-pointer select-none"
                >
                  <span>Book a Free Trial</span>
                </a>
                <Link
                  href="/workshops"
                  className="whitespace-nowrap inline-flex items-center justify-center px-7 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-sm tracking-wider rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer select-none"
                >
                  <span>Host A Workshop</span>
                </Link>
                <Link
                  href="/labs"
                  className="whitespace-nowrap inline-flex items-center justify-center px-7 py-3.5 border border-cyan-500/60 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 font-bold font-mono text-sm tracking-wider rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer select-none"
                >
                  <span>Setup a Lab</span>
                </Link>
              </div>

              {/* MOBILE-ONLY OPTIMIZED CTA SUITE */}
              <div className="flex sm:hidden flex-col gap-2.5 w-full max-w-xs mt-3">
                {/* Standout Primary Action */}
                <a
                  href="#sec-contact"
                  onClick={(e) => {
                    e.preventDefault();
                    document.documentElement.classList.remove("cybotz-splash-lock");
                    const target = document.getElementById("sec-contact") || document.getElementById("reach-us");
                    if (target) {
                      target.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className="w-full py-3.5 px-6 bg-[#F97405] active:bg-[#ff8614] text-slate-950 font-bold font-mono text-xs tracking-wider rounded-xl shadow-[0_10px_24px_rgba(249,116,5,0.22)] glow-orange transition-all flex items-center justify-center cursor-pointer"
                >
                  <span>Book a Free Trial</span>
                </a>

                {/* Secondary Dual Action Row */}
                <div className="grid grid-cols-2 gap-2.5 w-full">
                  <Link
                    href="/workshops"
                    className="py-2.5 px-2 bg-slate-900/90 border border-cyan-500/40 text-cyan-300 font-bold font-mono text-xs tracking-wider rounded-lg text-center backdrop-blur-sm active:bg-cyan-500/10 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    Host Workshop
                  </Link>
                  <Link
                    href="/labs"
                    className="py-2.5 px-2 bg-slate-900/90 border border-slate-700 hover:border-cyan-500/30 text-gray-300 font-bold font-mono text-xs tracking-wider rounded-lg text-center backdrop-blur-sm active:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    Setup a Lab
                  </Link>
                </div>

                {/* Mobile Hardware Telemetry Strip */}
                <div className="mt-2 px-3 py-1.5 rounded-lg bg-[#0B101D]/70 border border-slate-800/80 backdrop-blur-md flex items-center justify-between text-xs font-mono text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Bangalore Lab Active
                  </span>
                  <span className="text-cyan-400 font-semibold">Grades 5-12</span>
                </div>
              </div>

              </div>
            </motion.div>
          </div>
        </section>

        <section id="sec-telemetry" aria-label="Cybotz at a glance" className="relative z-10 pb-4">
          <div className="container px-4 md:px-8 mx-auto">
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Stat value={400} suffix="+" label="Students mentored" />
              <Stat value={INSTITUTIONS.length} label="Partner institutions" />
              <Stat value={12} prefix="5–" label="Grades in the lab" />
              <Stat value={100} suffix="%" label="Hands-on curriculum" />
            </dl>
          </div>
        </section>

        <SectionTrace />

        {/* SERVICES ("Glimpse Of What We Do") */}
        <section id="sec-services" className="pt-16 pb-10 md:pt-20 md:pb-12 bg-[#0B101D]/20 backdrop-blur-sm border-t border-[#1E293B]/60">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-wider mb-4">Glimpse Of What We Do</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Bridging the gap between conceptual theory and raw operational engineering.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Drone Workshop */}
              <div className="flight-card service-card p-8 rounded-xl bg-slate-950/25 border border-slate-800/60 backdrop-blur-md hover:border-cyan-500/50 transition-colors duration-300 group flex flex-col justify-between">
                <span className="card-scan" aria-hidden="true" />
                <div>
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                    <Zap size={24} />
                  </div>
                  <h3 className="text-xl font-bold font-mono mb-3">Drone Workshop</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    Learn to build, program, and fly drones from scratch. Learn flight mechanics and custom telemetry.
                  </p>
                </div>
                <button
                  onClick={() => handlePageNavigation("/workshops")}
                  className="flex items-center gap-2 text-cyan-400 font-mono text-xs hover:text-cyan-300 transition-colors cursor-pointer self-start"
                >
                  Host A Workshop <ArrowRight size={14} />
                </button>
              </div>

              {/* STEM Education */}
              <div className="flight-card service-card p-8 rounded-xl bg-slate-950/25 border border-slate-800/60 backdrop-blur-md hover:border-cyan-500/50 transition-colors duration-300 group flex flex-col justify-between">
                <span className="card-scan" aria-hidden="true" />
                <div>
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                    <Cpu size={24} />
                  </div>
                  <h3 className="text-xl font-bold font-mono mb-3">STEM - Education</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    Year-long electronics, coding & problem-solving programs structured for progressive skill acquisition.
                  </p>
                </div>
                <a
                  href="#sec-contact"
                  className="flex items-center gap-2 text-cyan-400 font-mono text-xs hover:text-cyan-300 transition-colors cursor-pointer self-start"
                >
                  Book a Consultation <ArrowRight size={14} />
                </a>
              </div>

              {/* Robotics Training */}
              <div className="flight-card service-card p-8 rounded-xl bg-slate-950/25 border border-slate-800/60 backdrop-blur-md hover:border-cyan-500/50 transition-colors duration-300 group flex flex-col justify-between">
                <span className="card-scan" aria-hidden="true" />
                <div>
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                    <Layers size={24} />
                  </div>
                  <h3 className="text-xl font-bold font-mono mb-3">Robotics Training</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    Hands-on experience in coding & assembling robots. Learn sensors integration, actuators, and logical circuits.
                  </p>
                </div>
                <button
                  onClick={() => handlePageNavigation("/labs")}
                  className="flex items-center gap-2 text-cyan-400 font-mono text-xs hover:text-cyan-300 transition-colors cursor-pointer self-start"
                >
                  Setup a Lab <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <SectionTrace />

        {/* SOCIAL PROOF / TRUSTED BY */}
        <section id="sec-network" className="pt-12 pb-20 md:pt-14 md:pb-24 relative overflow-hidden bg-[#0B101D]/40 backdrop-blur-sm border-t border-b border-[#1E293B]/70">
          {/* Glowing Ambient Background Lights */}
          <div className="home-parallax absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-cyan-500/15 rounded-full blur-[140px]" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px]" />
            {/* Mobile-optimized radiant ambient lighting */}
            <div className="sm:hidden absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-500/20 rounded-full blur-[90px]" />
            <div className="sm:hidden absolute bottom-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-600/20 rounded-full blur-[90px]" />
          </div>

          <div className="container px-4 md:px-8 mx-auto relative z-10">
            {/* Header */}
            <div className="max-w-3xl mx-auto text-center mb-16 space-y-3 scroll-in">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Premier Academic Network
              </div>
              <h2 className="text-3xl md:text-5xl font-bold font-mono tracking-wider text-white leading-tight">
                Trusted by Leading <span className="text-cyan-400 glow-cyan-text">Institutions</span>
              </h2>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                Empowering hundreds of students across top international schools and universities with raw, hands-on engineering education.
              </p>
            </div>

            {/* 3x3 Balanced Grid (8 Schools + 1 CTA Card) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {INSTITUTIONS.map((inst, index) => (
                <div
                  key={index}
                  className="flight-card scroll-in group relative p-6 rounded-2xl bg-gradient-to-b from-[#131d38]/80 via-[#0F172A]/75 to-[#0B101D]/80 border border-slate-700/70 sm:border-slate-800/60 hover:border-cyan-500/50 shadow-xl shadow-black/30 transition-colors duration-300 hover:shadow-[0_12px_35px_rgba(0,240,255,0.2)] backdrop-blur-md flex flex-col justify-between overflow-hidden"
                >
                  {/* Subtle top card glow line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent group-hover:via-cyan-400 transition-all duration-500 opacity-0 group-hover:opacity-100" />

                  <div className="flex items-start gap-4">
                    {/* Logo container with external website link */}
                    {inst.url ? (
                      <a
                        href={inst.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Visit official website of ${inst.name}`}
                        className="w-20 h-16 rounded-xl bg-white/95 p-2.5 border border-slate-200/20 shadow-md flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:shadow-lg hover:ring-2 hover:ring-cyan-400 transition-all duration-300 overflow-hidden cursor-pointer"
                      >
                        <LiquidGlassImage
                          src={inst.logo}
                          alt={`${inst.name} logo`}
                          className="max-w-full max-h-full"
                          imgClassName="object-contain"
                          showSlowNetworkBadge={false}
                        />
                      </a>
                    ) : (
                      <div className="w-20 h-16 rounded-xl bg-white/95 p-2.5 border border-slate-200/20 shadow-md flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:shadow-lg transition-transform duration-300 overflow-hidden">
                        <LiquidGlassImage
                          src={inst.logo}
                          alt={`${inst.name} logo`}
                          className="max-w-full max-h-full"
                          imgClassName="object-contain"
                          showSlowNetworkBadge={false}
                        />
                      </div>
                    )}

                    {/* Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <School size={14} className="text-cyan-400 shrink-0" />
                        <span className="text-xs font-mono uppercase tracking-widest text-cyan-400/90 font-semibold truncate">
                          STEM Partner
                        </span>
                      </div>
                      <h4 className="font-bold text-white font-mono text-base leading-snug group-hover:text-cyan-300 transition-colors line-clamp-2">
                        {inst.name}
                      </h4>
                    </div>
                  </div>

                  {/* Highlights section with cyber styling */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-300 font-sans line-clamp-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                      <InstitutionLine text={inst.text} />
                    </span>
                    <span className="text-xs font-mono text-gray-400 flex items-center gap-1 shrink-0 ml-2">
                      <MapPin size={12} className="text-gray-400" />
                      Bangalore
                    </span>
                  </div>
                </div>
              ))}

              {/* 9th CTA Card to perfectly complete the 3x3 Grid */}
              <div className="flight-card scroll-in group relative p-6 rounded-2xl bg-gradient-to-br from-cyan-950/60 via-[#111c38]/85 to-[#0B101D]/85 border border-cyan-500/50 hover:border-cyan-400 shadow-xl shadow-cyan-950/40 transition-colors duration-300 hover:shadow-[0_12px_35px_rgba(0,240,255,0.3)] backdrop-blur-md flex flex-col justify-between overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-blue-500" />

                <div className="flex items-start gap-4">
                  <div className="w-20 h-16 rounded-xl bg-slate-900/60 p-2 border border-cyan-500/30 shadow-md flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                    <img src="/logos/cybotz_transparent.png?v=3" alt="Cybotz Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white font-mono text-base mb-1 group-hover:text-cyan-300 transition-colors leading-snug">
                      Partner With Cybotz
                    </h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Bring hands-on drone & robotics ecosystems to your campus students.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-cyan-500/20 flex items-center justify-between">
                  <a
                    href="#sec-contact"
                    className="w-full py-2.5 bg-[#F97405] hover:bg-[#ff8614] text-slate-950 font-mono font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_8px_20px_rgba(249,116,5,0.35)] glow-orange cursor-pointer"
                  >
                    Host A Workshop <ArrowRight size={14} />
                  </a>
                </div>
              </div>

            </div>

          </div>
        </section>

        <SectionTrace />

        {/* VALUE PROP & PILLARS ("NO AI : Core Fundamentals Only!") */}
        <section id="sec-mastery" className="py-12 sm:py-20 bg-[#0B101D]/20 backdrop-blur-sm border-t border-[#1E293B]/60">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

              {/* Left Column: Interactive Terminal & Copy */}
              <div className="scroll-in flex flex-col gap-5 sm:gap-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] font-mono text-xs uppercase tracking-wider self-start">
                  NO AI : Core Fundamentals Only!
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono tracking-tight sm:tracking-wider leading-tight">
                  Your Path to Mastery: Expert Training, Hands-On Learning, and STEM Focus.
                </h2>
                <p className="text-gray-300 sm:text-gray-400 text-base sm:text-lg leading-relaxed">
                  We don't teach shortcuts or copy-paste prompt engineering. We build engineers who understand physics, mathematics, and logic from first principles.
                </p>

                {/* Interactive Cybotz Terminal (Desktop / Large screen only) */}
                <div className="hidden lg:block">
                  <CybotzTerminal />
                </div>
              </div>

              {/* Right Column: Pillars Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  {
                    icon: Shield,
                    title: "Expert-Led Training",
                    desc: "Learn directly from industry professionals specializing in aerospace drone dynamics and real robotics engineering."
                  },
                  {
                    icon: FileCode2,
                    title: "100% Hands-On Learning",
                    desc: "No shortcuts. No copy-pasting lines of code. We focus on raw compilation and structural, real-world troubleshooting."
                  },
                  {
                    icon: Zap,
                    title: "No AI-Based Learning",
                    desc: "We emphasize raw physics, logic architectures, and fundamental mathematics. We train thinkers, not prompt generators."
                  },
                  {
                    icon: Globe,
                    title: "Recognized by Top Schools",
                    desc: "Trusted by leading institutions, principals, and academic coordinators across Bangalore for our uncompromising standards."
                  }
                ].map((pillar, idx) => (
                  <div key={idx} className="flight-card scroll-in p-6 rounded-xl bg-slate-950/25 border border-slate-800/60 backdrop-blur-md hover:border-cyan-500/40 transition-colors duration-300">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
                      <pillar.icon size={20} />
                    </div>
                    <h4 className="font-bold text-white font-mono text-base mb-2">{pillar.title}</h4>
                    <p className="text-gray-300 text-sm md:text-base leading-relaxed">{pillar.desc}</p>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* BOOKING CALENDAR & CONTACT FORM */}
        <SectionTrace />

        <section id="sec-contact" className="py-20 bg-[#0B101D]/20 backdrop-blur-sm border-t border-[#1E293B]/60">
          <div className="container px-4 md:px-8 mx-auto" id="reach-us">
            <div className="text-center mb-6 sm:mb-8 scroll-in">
              <span className="text-sm font-bold font-mono text-cyan-400 tracking-widest uppercase">Get in Touch</span>
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-wider mt-2 mb-3">Contact Us</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-base">
                Have questions about bringing Cybotz labs or workshops to your institution? Connect with our engineers in Bangalore.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

              {/* Left Side: Bento Calendar & Contacts (col-7) */}
              <div className="scroll-in lg:col-span-7 flex flex-col gap-6 justify-between">

                {/* Calendar element */}
                <div className="flex-grow">
                  <Calendar />
                </div>

                {/* Direct Contacts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-800/60 backdrop-blur-md flex flex-col gap-2">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                      <MapPin size={16} />
                    </div>
                    <span className="text-sm font-bold text-white font-mono">Location</span>
                    <span className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                      3rd cross, Garden Street Ext., Bangalore - 560016
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-800/60 backdrop-blur-md flex flex-col gap-2">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                      <Phone size={16} />
                    </div>
                    <span className="text-sm font-bold text-white font-mono">Phone</span>
                    <a href="tel:+917349045770" className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-semibold">
                      +91 7349045770
                    </a>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-800/60 backdrop-blur-md flex flex-col gap-2">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                      <Mail size={16} />
                    </div>
                    <span className="text-sm font-bold text-white font-mono">Email</span>
                    <a href="mailto:info@cybotz.tech" className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-semibold break-all">
                      info@cybotz.tech
                    </a>
                  </div>
                </div>

              </div>

              {/* Right Side: Consultation Request Form (col-5) */}
              <div className="scroll-in lg:col-span-5 p-8 rounded-2xl bg-slate-950/35 border border-slate-800/70 backdrop-blur-md flex flex-col justify-between shadow-xl">
                <div>
                  <h3 className="text-xl font-bold font-mono tracking-wider text-cyan-400 mb-6 uppercase">Consultation Request</h3>

                  {formSubmitted ? (
                    <div className="p-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-center space-y-4 animate-fade-in">
                      <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                        <CheckCircle className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white font-mono">Inquiry Prepared!</h4>
                        <p className="text-sm text-gray-300 font-sans mt-1 leading-relaxed">
                          Your email client has been opened with your inquiry draft addressed to <span className="text-cyan-300 font-mono">info@cybotz.tech</span>.
                        </p>
                      </div>
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-left text-xs font-mono space-y-1 text-gray-300">
                        <p><span className="text-gray-500">From:</span> {formData.name}</p>
                        <p><span className="text-gray-500">School:</span> {formData.school}</p>
                        <p><span className="text-gray-500">Email:</span> {formData.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormSubmitted(false);
                          setFormData({ name: "", school: "", email: "", message: "" });
                        }}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 transition-colors cursor-pointer"
                      >
                        Submit Another Inquiry
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="form-name" className="block text-sm font-bold font-mono text-gray-300 uppercase mb-1.5">
                          Your Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="form-name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={e => {
                            setFormData(prev => ({ ...prev, name: e.target.value }));
                            if (formErrors.name) setFormErrors(prev => ({ ...prev, name: undefined }));
                          }}
                          className={`w-full px-4 py-2.5 bg-[#0F172A]/50 backdrop-blur-sm border rounded-lg text-white text-base placeholder-gray-600 focus:outline-none transition-all duration-300 ${formErrors.name ? "border-rose-500 focus:border-rose-400" : "border-slate-800 focus:border-cyan-500"
                            }`}
                          placeholder="John Doe"
                        />
                        {formErrors.name && (
                          <p className="text-sm text-rose-400 font-mono mt-1">{formErrors.name}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="form-school" className="block text-sm font-bold font-mono text-gray-300 uppercase mb-1.5">
                          Institution / School Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="form-school"
                          type="text"
                          required
                          value={formData.school}
                          onChange={e => {
                            setFormData(prev => ({ ...prev, school: e.target.value }));
                            if (formErrors.school) setFormErrors(prev => ({ ...prev, school: undefined }));
                          }}
                          className={`w-full px-4 py-2.5 bg-[#0F172A]/50 backdrop-blur-sm border rounded-lg text-white text-base placeholder-gray-600 focus:outline-none transition-all duration-300 ${formErrors.school ? "border-rose-500 focus:border-rose-400" : "border-slate-800 focus:border-cyan-500"
                            }`}
                          placeholder="Canadian International School"
                        />
                        {formErrors.school && (
                          <p className="text-sm text-rose-400 font-mono mt-1">{formErrors.school}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="form-email" className="block text-sm font-bold font-mono text-gray-300 uppercase mb-1.5">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="form-email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={e => {
                            setFormData(prev => ({ ...prev, email: e.target.value }));
                            if (formErrors.email) setFormErrors(prev => ({ ...prev, email: undefined }));
                          }}
                          className={`w-full px-4 py-2.5 bg-[#0F172A]/50 backdrop-blur-sm border rounded-lg text-white text-base placeholder-gray-600 focus:outline-none transition-all duration-300 ${formErrors.email ? "border-rose-500 focus:border-rose-400" : "border-slate-800 focus:border-cyan-500"
                            }`}
                          placeholder="john@example.com"
                        />
                        {formErrors.email && (
                          <p className="text-sm text-rose-400 font-mono mt-1">{formErrors.email}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="form-message" className="block text-sm font-bold font-mono text-gray-300 uppercase mb-1.5">
                          Message <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          id="form-message"
                          rows={3}
                          required
                          value={formData.message}
                          onChange={e => {
                            setFormData(prev => ({ ...prev, message: e.target.value }));
                            if (formErrors.message) setFormErrors(prev => ({ ...prev, message: undefined }));
                          }}
                          className={`w-full px-4 py-2.5 bg-[#0F172A]/50 backdrop-blur-sm border rounded-lg text-white text-base placeholder-gray-600 focus:outline-none transition-all duration-300 resize-none ${formErrors.message ? "border-rose-500 focus:border-rose-400" : "border-slate-800 focus:border-cyan-500"
                            }`}
                          placeholder="Tell us about the grades, estimate student count, or timing preferences..."
                        />
                        {formErrors.message && (
                          <p className="text-sm text-rose-400 font-mono mt-1">{formErrors.message}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#F97405] text-slate-950 font-bold font-mono text-sm tracking-wider rounded-lg hover:bg-[#ff8614] transition-all duration-300 glow-orange cursor-pointer"
                        aria-label="Send Consultation Request via Email"
                      >
                        <Send size={16} /> Send Request via Email
                      </button>
                    </form>
                  )}
                </div>
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

function KineticAccent({ text, play }: { text: string; play: boolean }) {
  const words = text.split(" ");
  return (
    <span className="inline-flex flex-wrap justify-center lg:justify-start gap-x-[0.28em] text-cyan-400 glow-cyan-text align-bottom">
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden pb-[0.08em]">
          <span
            className={play ? "kinetic-word is-play" : "kinetic-word"}
            style={play ? { animationDelay: `${index * 0.07}s` } : undefined}
          >
            {word}
          </span>
        </span>
      ))}
    </span>
  );
}

function Stat({
  value,
  suffix = "",
  prefix = "",
  label,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
}) {
  return (
    <div className="flight-card scroll-in rounded-xl border border-slate-800/80 bg-[#0B101D]/55 p-4 backdrop-blur-md md:p-5">
      <dt className="font-mono text-2xl font-bold tracking-wide text-cyan-400 md:text-3xl">
        {prefix}
        <span data-count={value} data-suffix={suffix}>
          {value}
          {suffix}
        </span>
      </dt>
      <dd className="mt-1 font-mono text-[11px] uppercase tracking-widest text-gray-400 md:text-xs">{label}</dd>
    </div>
  );
}

function InstitutionLine({ text }: { text: string }) {
  const match = text.match(/^(\d+)([\s\S]*)$/);
  if (!match) return <>{text}</>;
  return (
    <>
      <span data-count={match[1]}>{match[1]}</span>
      {match[2]}
    </>
  );
}
