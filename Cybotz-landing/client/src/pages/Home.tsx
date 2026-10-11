import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar } from "@/elements/calendar";
import CybotzTerminal from "@/components/CybotzTerminal";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Send, Mail, Phone, MapPin, ArrowRight, CheckCircle } from "lucide-react";
import { INSTITUTIONS } from "@/data";
import { captureUtmParams } from "@/lib/utm";
import { usePageMeta } from "@/hooks/usePageMeta";
import { LiquidGlassSlowNetworkBanner } from "@/components/ui/SkeletonLoader";
import { SectionTrace } from "@/components/home/SectionTrace";
import { IntroOverlay } from "@/components/home/IntroOverlay";
import { useHomeMotion } from "@/components/home/useHomeMotion";
import { useDroneStage } from "@/components/home/useDroneStage";
import { HeroCraft } from "@/components/home/HeroCraft";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ContactFormData {
  name: string;
  school: string;
  email: string;
  message: string;
}

const CHAPTERS = [
  {
    id: "01",
    title: "Drone Workshop",
    body: "Learn to build, program, and fly drones from scratch. Learn flight mechanics and custom telemetry.",
    href: "/workshops",
    label: "Host a Workshop",
    media: "/media/log-b3.mp4",
    poster: "/media/log-b3.webp",
  },
  {
    id: "02",
    title: "STEM Education",
    body: "Year-long electronics, coding and problem-solving programs structured for progressive skill acquisition.",
    href: "#sec-contact",
    label: "Book a Consultation",
    media: "/media/log-b1.mp4",
    poster: "/media/log-b1.webp",
  },
  {
    id: "03",
    title: "Robotics Training",
    body: "Hands-on experience in coding and assembling robots. Learn sensors integration, actuators, and logical circuits.",
    href: "/labs",
    label: "Setup a Lab",
    media: "/media/log-b2.mp4",
    poster: "/media/log-b2.webp",
  },
];

const PINS = [
  { x: 118, y: 78 },
  { x: 196, y: 96 },
  { x: 86, y: 150 },
  { x: 168, y: 168 },
  { x: 230, y: 154 },
  { x: 124, y: 214 },
  { x: 188, y: 236 },
  { x: 150, y: 128 },
];

export default function Home() {
  const [, setLocation] = useLocation();
  useHomeMotion(true);
  useDroneStage(true);

  usePageMeta(
    "Cybotz | Empowering Young Minds with Real-World STEM Skills",
    "Hands-on Drone, Electronics, and Robotics training for schools in Bangalore. 100% practical learning — no AI shortcuts, no play-kits."
  );

  const [formData, setFormData] = useState<ContactFormData>({ name: "", school: "", email: "", message: "" });
  const [formErrors, setFormErrors] = useState<{ name?: string; school?: string; email?: string; message?: string }>({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [pin, setPin] = useState<number | null>(null);

  useEffect(() => {
    const handleDateSelect = (e: Event) => {
      const day = (e as CustomEvent).detail;
      const month = new Date().toLocaleString("default", { month: "long" });
      const year = new Date().getFullYear();
      setFormData((prev: ContactFormData) => {
        const baseMessage = prev.message.replace(/^I would like to book a free trial session on .*\n\n/i, "");
        return { ...prev, message: `I would like to book a free trial session on ${month} ${day}, ${year}.\n\n${baseMessage}` };
      });
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

  const go = (path: string) => {
    if (path.startsWith("#")) {
      document.querySelector(path)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setLocation(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const field = (invalid: boolean) => `log-input${invalid ? " is-invalid" : ""}`;

  return (
    <div className="home-stage">
      <div className="paper-field" aria-hidden="true">
        <div className="blueprint" />
        <div className="paper-noise" />
        <div className="paper-vignette" />
      </div>
      <Header />
      <IntroOverlay />
      <HeroCraft />

      <main id="main-content" className="log-main">
        <section id="sec-hero" className="log-hero">
          <div className="log-wrap hero-grid">
            <div className="hero-copy">
              <p className="log-kicker">LOG 01 — Bangalore · Grades 5–12</p>
              <h1 tabIndex={-1}>
                Empower young minds
                <br />
                with real-world
                <br />
                <span className="line-cyan">STEM skills</span>
              </h1>
              <p className="log-sub">
                Give your students the edge they deserve by mastering raw engineering fundamentals from the ground up.
              </p>
              <div className="hero-actions">
                <button type="button" className="btn-primary" onClick={() => go("#sec-contact")}>
                  Book a Free Trial <ArrowRight size={18} aria-hidden="true" />
                </button>
                <button type="button" className="btn-line" onClick={() => go("/workshops")}>
                  Host a Workshop
                </button>
                <button type="button" className="btn-text" onClick={() => go("/labs")}>
                  Setup a Lab <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="drone-slot" aria-hidden="true">
              <svg className="callouts" viewBox="0 0 640 480">
                <Callout x1={120} y1={150} x2={250} y2={190} label="PROPELLER" />
                <Callout x1={150} y1={300} x2={270} y2={250} label="BRUSHLESS MOTOR" />
                <Callout x1={520} y1={160} x2={390} y2={210} label="FPV CAMERA" />
                <Callout x1={500} y1={330} x2={360} y2={250} label="FLIGHT CONTROLLER" />
              </svg>
            </div>
          </div>
          <p id="flight-ticker" className="flight-ticker" aria-hidden="true">
            ALT 001.2 m · HDG 284° · BAT 98%
          </p>
        </section>

        <section id="sec-telemetry" aria-label="Cybotz at a glance">
          <div className="log-wrap">
            <p className="log-kicker">LOG 02 — Telemetry</p>
            <dl className="telemetry">
              <Odometer value={400} suffix="+" label="Students mentored" />
              <Odometer value={INSTITUTIONS.length} label="Partner institutions" />
              <div className="readout">
                <dt>5–12</dt>
                <dd>Grades in the lab</dd>
              </div>
              <Odometer value={100} suffix="%" label="Hands-on curriculum" />
            </dl>
          </div>
          <SectionTrace />
        </section>

        <ServicesLog onGo={go} />

        <section id="sec-network">
          <div className="log-wrap network-grid">
            <div>
              <p className="log-kicker">LOG 04 — Partner schools</p>
              <h2>Trusted by schools across Bangalore</h2>
              <p className="log-sub">
                Empowering hundreds of students across top international schools and universities with raw, hands-on engineering education.
              </p>
              <svg className="city-map" viewBox="0 0 320 320" aria-hidden="true">
                <ellipse cx="160" cy="160" rx="128" ry="132" fill="none" stroke="#CFDBE4" />
                <path d="M30 160 H290 M160 24 V296 M48 70 L270 250 M52 250 L268 64" fill="none" stroke="#CFDBE4" />
                {PINS.map((spot, index) => (
                  <g key={spot.x} className={pin === index ? "is-hot" : ""}>
                    <circle cx={spot.x} cy={spot.y} r="8" className="pin-pulse" />
                    <circle cx={spot.x} cy={spot.y} r="4" className="pin-dot" />
                  </g>
                ))}
              </svg>
            </div>
            <ul className="school-rows">
              {INSTITUTIONS.map((inst, index) => (
                <li
                  key={inst.name}
                  onMouseEnter={() => setPin(index)}
                  onMouseLeave={() => setPin(null)}
                  onFocus={() => setPin(index)}
                  onBlur={() => setPin(null)}
                >
                  <img src={inst.logo} alt="" />
                  <div>
                    <strong>{inst.name}</strong>
                    <span>{inst.text}</span>
                    <em>Bangalore</em>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="sec-mastery">
          <div className="night-grid" aria-hidden="true" />
          <svg className="solder" viewBox="0 0 40 800" preserveAspectRatio="none" aria-hidden="true">
            <path d="M20 0 V800" />
          </svg>
          <div className="log-wrap">
            <p className="log-kicker night">NO AI : Core Fundamentals Only!</p>
            <p className="night-statement">
              <span>No AI.</span>
              <span>No shortcuts.</span>
              <span>Just physics, maths and logic.</span>
            </p>
            <h2>Your Path to Mastery: Expert Training, Hands-On Learning, and STEM Focus.</h2>
            <p className="mist">
              We don&apos;t teach shortcuts or copy-paste prompt engineering. We build engineers who understand physics, mathematics, and logic from first principles.
            </p>
            <ol className="pillars">
              <li>
                <span>01</span>
                <div>
                  <strong>Expert-Led Training</strong>
                  <p>Learn directly from industry professionals specializing in aerospace drone dynamics and real robotics engineering.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>100% Hands-On Learning</strong>
                  <p>No shortcuts. No copy-pasting lines of code. We focus on raw compilation and structural, real-world troubleshooting.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>No AI-Based Learning</strong>
                  <p>We emphasize raw physics, logic architectures, and fundamental mathematics. We train thinkers, not prompt generators. Trusted by leading institutions across Bangalore.</p>
                </div>
              </li>
            </ol>
            <div className="night-terminal">
              <CybotzTerminal />
            </div>
          </div>
        </section>

        <section id="sec-contact">
          <div className="log-wrap contact-grid" id="reach-us">
            <div>
              <p className="log-kicker">LOG 06 — Contact</p>
              <h2>Contact Us</h2>
              <p className="log-sub">
                Have questions about bringing Cybotz labs or workshops to your institution? Connect with our engineers in Bangalore.
              </p>
              <Calendar />
              <ul className="contact-facts">
                <li>
                  <MapPin size={16} aria-hidden="true" />
                  <span>3rd cross, Garden Street Ext., Bangalore - 560016</span>
                </li>
                <li>
                  <Phone size={16} aria-hidden="true" />
                  <a href="tel:+917349045770">+91 7349045770</a>
                </li>
                <li>
                  <Mail size={16} aria-hidden="true" />
                  <a href="mailto:info@cybotz.tech">info@cybotz.tech</a>
                </li>
              </ul>
              <div className="log-card">
                <h3>Consultation Request</h3>
                {formSubmitted ? (
                  <div className="form-done">
                    <CheckCircle aria-hidden="true" />
                    <p>
                      Your email client has been opened with your inquiry draft addressed to info@cybotz.tech.
                    </p>
                    <button
                      type="button"
                      className="btn-line"
                      onClick={() => {
                        setFormSubmitted(false);
                        setFormData({ name: "", school: "", email: "", message: "" });
                      }}
                    >
                      Submit Another Inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit}>
                    <label htmlFor="form-name">
                      Your Name
                      <input id="form-name" className={field(!!formErrors.name)} value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required />
                    </label>
                    {formErrors.name && <p className="field-error">{formErrors.name}</p>}
                    <label htmlFor="form-school">
                      Institution / School Name
                      <input id="form-school" className={field(!!formErrors.school)} value={formData.school} onChange={(e) => setFormData((p) => ({ ...p, school: e.target.value }))} required />
                    </label>
                    {formErrors.school && <p className="field-error">{formErrors.school}</p>}
                    <label htmlFor="form-email">
                      Email Address
                      <input id="form-email" type="email" className={field(!!formErrors.email)} value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} required />
                    </label>
                    {formErrors.email && <p className="field-error">{formErrors.email}</p>}
                    <label htmlFor="form-message">
                      Message
                      <textarea id="form-message" rows={4} className={field(!!formErrors.message)} value={formData.message} onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))} required />
                    </label>
                    {formErrors.message && <p className="field-error">{formErrors.message}</p>}
                    <button type="submit" className="btn-primary">
                      <Send size={16} aria-hidden="true" /> Send Request via Email
                    </button>
                  </form>
                )}
              </div>
            </div>
            <div className="landing-pad" aria-hidden="true">
              <svg viewBox="0 0 240 240">
                <circle cx="120" cy="120" r="108" fill="none" stroke="#0B1620" strokeDasharray="4 6" />
                <path d="M70 78 H108 V162 H70 M170 78 H132 V162 H170" fill="none" stroke="#0B1620" strokeWidth="6" />
              </svg>
              <p>LANDED — READY FOR YOUR SCHOOL</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <LiquidGlassSlowNetworkBanner />
    </div>
  );
}

function Callout({ x1, y1, x2, y2, label }: { x1: number; y1: number; x2: number; y2: number; label: string }) {
  return (
    <g className="callout">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <circle cx={x2} cy={y2} r="4" />
      <text x={x1} y={y1} textAnchor={x1 > 320 ? "end" : "start"}>
        {label}
      </text>
    </g>
  );
}

function Odometer({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOn(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setOn(true);
        observer.disconnect();
      },
      { threshold: 0.8 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const digits = String(value).split("");
  return (
    <div className="readout" ref={ref}>
      <dt aria-label={`${value}${suffix}`}>
        {digits.map((digit, index) => (
          <span className="odo-window" key={`${digit}-${index}`}>
            <span
              className={on ? "odo-strip is-on" : "odo-strip"}
              style={{ transform: on ? `translateY(calc(${digit} * -1em))` : "translateY(0)", transitionDelay: `${index * 120}ms` }}
            >
              {Array.from({ length: 10 }, (_, n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        ))}
        {suffix && <span className="odo-suffix">{suffix}</span>}
      </dt>
      <dd>{label}</dd>
    </div>
  );
}

function ServicesLog({ onGo }: { onGo: (path: string) => void }) {
  const ref = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState(0);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const view = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setSeen(true);
    });
    view.observe(el);
    const desktop = window.matchMedia("(min-width: 1024px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!desktop.matches || reduce.matches) return () => view.disconnect();
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const next = self.progress < 0.33 ? 0 : self.progress < 0.66 ? 1 : 2;
        setChapter((prev) => (prev === next ? prev : next));
      },
    });
    return () => {
      view.disconnect();
      trigger.kill();
    };
  }, []);

  const active = CHAPTERS[chapter];

  return (
    <section id="sec-services" ref={ref}>
      <div className="services-sticky log-wrap">
        <p className="log-kicker">LOG 03 — Services</p>
        <div className="services-grid">
          <div>
            <ol className="chapters">
              {CHAPTERS.map((item, index) => (
                <li key={item.id} className={index === chapter ? "is-on" : ""}>
                  <button type="button" onClick={() => setChapter(index)}>
                    <span>{item.id}</span> {item.title}
                  </button>
                </li>
              ))}
            </ol>
            <p className="chapter-body">{active.body}</p>
            <button type="button" className="btn-text" onClick={() => onGo(active.href)}>
              {active.label} <ArrowRight size={16} aria-hidden="true" />
            </button>
            <video
              key={active.media}
              className="chapter-media"
              muted
              loop
              playsInline
              autoPlay
              preload={seen ? "metadata" : "none"}
              poster={active.poster}
            >
              {seen && <source src={active.media} type="video/mp4" />}
            </video>
          </div>
          <div className="drone-slot services-slot" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
