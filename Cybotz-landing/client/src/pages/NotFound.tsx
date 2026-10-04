import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  usePageMeta(
    "Page Not Found | Cybotz",
    "The page you're looking for doesn't exist. Head back to explore workshops, labs, and STEM resources."
  );

  const handleNavigate = (path: string) => {
    setLocation(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="relative text-white min-h-screen flex flex-col font-sans bg-[#0F172A]">
      <Header />

      <main className="flex-grow flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-lg mx-auto">

          {/* Animated drone SVG */}
          <div className="relative w-40 h-40 mx-auto mb-8">
            {/* Pulse rings */}
            <div className="absolute inset-[-16px] rounded-full border border-cyan-500/15 animate-[ping_3s_ease-out_infinite]" />
            <div className="absolute inset-[-16px] rounded-full border border-cyan-500/10 animate-[ping_3s_ease-out_1s_infinite]" />

            {/* Drone illustration */}
            <svg
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-[0_0_30px_rgba(0,240,255,0.2)] animate-[bounce_4s_ease-in-out_infinite]"
            >
              {/* Propeller arms */}
              <line x1="60" y1="70" x2="100" y2="100" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
              <line x1="140" y1="70" x2="100" y2="100" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
              <line x1="60" y1="130" x2="100" y2="100" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
              <line x1="140" y1="130" x2="100" y2="100" stroke="#334155" strokeWidth="3" strokeLinecap="round" />

              {/* Propeller circles (spinning effect) */}
              <circle cx="60" cy="70" r="18" stroke="#00F0FF" strokeWidth="1.5" fill="none" opacity="0.4" className="animate-spin origin-center" style={{ transformOrigin: "60px 70px" }} />
              <circle cx="140" cy="70" r="18" stroke="#00F0FF" strokeWidth="1.5" fill="none" opacity="0.4" className="animate-spin origin-center" style={{ transformOrigin: "140px 70px" }} />
              <circle cx="60" cy="130" r="18" stroke="#00F0FF" strokeWidth="1.5" fill="none" opacity="0.4" className="animate-spin origin-center" style={{ transformOrigin: "60px 130px" }} />
              <circle cx="140" cy="130" r="18" stroke="#00F0FF" strokeWidth="1.5" fill="none" opacity="0.4" className="animate-spin origin-center" style={{ transformOrigin: "140px 130px" }} />

              {/* Motor hubs */}
              <circle cx="60" cy="70" r="5" fill="#1e293b" stroke="#00F0FF" strokeWidth="1" />
              <circle cx="140" cy="70" r="5" fill="#1e293b" stroke="#00F0FF" strokeWidth="1" />
              <circle cx="60" cy="130" r="5" fill="#1e293b" stroke="#00F0FF" strokeWidth="1" />
              <circle cx="140" cy="130" r="5" fill="#1e293b" stroke="#00F0FF" strokeWidth="1" />

              {/* Center body */}
              <rect x="85" y="88" width="30" height="24" rx="6" fill="#1e293b" stroke="#00F0FF" strokeWidth="1.5" />

              {/* Camera / LED eye */}
              <circle cx="100" cy="100" r="4" fill="#00F0FF" opacity="0.8">
                <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
              </circle>

              {/* Landing gear */}
              <line x1="88" y1="112" x2="82" y2="125" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
              <line x1="112" y1="112" x2="118" y2="125" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
              <line x1="78" y1="125" x2="86" y2="125" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="114" y1="125" x2="122" y2="125" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Glitch 404 heading */}
          <div className="relative mb-2">
            <h1 className="text-8xl md:text-9xl font-bold font-mono text-cyan-500/15 select-none">
              404
            </h1>
            <h1 className="text-8xl md:text-9xl font-bold font-mono text-cyan-400 absolute inset-0 flex items-center justify-center">
              404
            </h1>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold font-mono text-white mb-3 tracking-wider">
            Signal Lost
          </h2>

          <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed text-sm md:text-base">
            The page you're looking for has drifted out of range.
            <br />
            Let's get you back on course.
          </p>

          {/* Primary CTA */}
          <button
            onClick={() => handleNavigate("/")}
            className="px-8 py-3.5 bg-cyan-500 text-[#0F172A] font-bold font-mono text-sm tracking-wider rounded-lg hover:bg-cyan-400 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.35)] cursor-pointer mb-8"
          >
            ← Return to Mission Control
          </button>

          {/* Quick navigation links */}
          <div className="border-t border-slate-800 pt-6">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-4">Quick Links</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: "Workshops", path: "/workshops" },
                { label: "Labs", path: "/labs" },
                { label: "Blogs", path: "/blogs" },
                { label: "About Us", path: "/about" },
              ].map((link) => (
                <button
                  key={link.path}
                  onClick={() => handleNavigate(link.path)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-cyan-500/50 text-gray-300 hover:text-cyan-400 text-xs font-mono transition-all duration-300 cursor-pointer"
                >
                  {link.label} <ArrowRight size={12} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
