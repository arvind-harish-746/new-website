import { SOCIAL_LINKS, NAV_LINKS } from '@/data';
import { Linkedin, Instagram, ShieldAlert, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { AdminModal } from './AdminModal';

const ICON_MAP: Record<string, React.ComponentType<{ size: number }>> = {
  linkedin: Linkedin,
  instagram: Instagram,
};

export default function Footer() {
  const [location, setLocation] = useLocation();
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const handleNavigation = (href: string) => {
    if (href.startsWith('#')) {
      const targetId = href.replace('#', '');
      if (location !== '/') {
        setLocation('/');
        setTimeout(() => {
          const element = document.getElementById(targetId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 150);
      } else {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      setLocation(href);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative z-10 bg-[#E7F2FA] border-t border-[#C9DDEC] py-12 md:py-16 mt-auto">
      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      <div className="container px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center">
              <img
                src="/logos/cybotz_transparent.png"
                alt="Cybotz"
                className="h-10 md:h-12 w-auto object-contain"
              />
            </div>
            <p className="text-[#3E5168] text-sm leading-relaxed max-w-sm">
              Hands-on Drone, Electronics, and Robotics training for schools in Bangalore. No AI, no shortcuts, just core fundamentals.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[#102033] font-bold font-mono mb-4 text-sm uppercase tracking-wider text-[#0460A9]">Quick Links</h4>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => handleNavigation(link.href)}
                    className="text-[#3E5168] hover:text-[#0460A9] transition-all duration-300 text-sm md:text-base bg-transparent border-none p-0 cursor-pointer"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Core Areas */}
          <div>
            <h4 className="text-[#102033] font-bold font-mono mb-4 text-sm uppercase tracking-wider text-[#0460A9] font-mono">Ecosystem</h4>
            <ul className="space-y-2.5 text-[#3E5168] text-sm md:text-base">
              <li>
                <button
                  onClick={() => handleNavigation('/labs')}
                  className="hover:text-[#0460A9] transition-all duration-300 text-left bg-transparent border-none p-0 cursor-pointer"
                >
                  STEM School Labs
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('/workshops')}
                  className="hover:text-[#0460A9] transition-all duration-300 text-left bg-transparent border-none p-0 cursor-pointer"
                >
                  Drone Engineering
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('/workshops')}
                  className="hover:text-[#0460A9] transition-all duration-300 text-left bg-transparent border-none p-0 cursor-pointer"
                >
                  Robotics Bootcamps
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('#reach-us')}
                  className="hover:text-[#0460A9] transition-all duration-300 text-left bg-transparent border-none p-0 cursor-pointer"
                >
                  Consultation
                </button>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="text-[#102033] font-bold font-mono mb-4 text-sm uppercase tracking-wider text-[#0460A9]">Follow Us</h4>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map((link) => {
                const Icon = ICON_MAP[link.icon];
                if (!Icon) return null;
                return (
                  <div key={link.label} className="relative group">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-lg bg-[#E7F2FA] border border-[#C9DDEC] hover:border-cyan-500 hover:text-[#0460A9] text-[#3E5168] flex items-center justify-center transition-all duration-300 hover:shadow-[0_8px_20px_rgba(249,116,5,0.18)]"
                      aria-label={`Follow Cybotz on ${link.label}`}
                      title={link.label}
                    >
                      <Icon size={18} />
                    </a>
                    {/* Tooltip */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-white border border-cyan-500/40 rounded-md text-xs font-mono text-[#0460A9] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg whitespace-nowrap z-30">
                      {link.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#C9DDEC] my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-sm text-[#3E5168]">
            <p>© {new Date().getFullYear()} CYBOTZ. All rights reserved.</p>
            <p className="w-full basis-full text-[11px] leading-relaxed text-[#43566A] font-sans normal-case tracking-normal">
              Drone model: &quot;Dji FPV by SDC&quot; by SDC PERFORMANCE™️, CC BY 4.0. This work is based on{" "}
              <a
                href="https://sketchfab.com/3d-models/dji-fpv-by-sdc-high-performance-drone-d471ea8c6235457b8e131842e2cf3783"
                className="underline"
                rel="license"
              >
                Dji FPV by SDC - High performance drone
              </a>{" "}
              by SDC PERFORMANCE™️ (
              <a href="https://sketchfab.com/3Duae" className="underline">3Duae</a>
              {" / "}
              <a href="https://sketchfab.com/Lambo_SC04" className="underline">Lambo_SC04</a>
              ) licensed under{" "}
              <a href="https://creativecommons.org/licenses/by/4.0/" className="underline" rel="license">
                CC BY 4.0
              </a>
              .
            </p>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <button
              onClick={() => handleNavigation('/student')}
              className="flex items-center gap-1.5 text-[#0460A9] hover:text-[#0460A9] font-mono text-sm transition-all cursor-pointer bg-transparent border-none p-0"
            >
              <GraduationCap size={15} className="text-[#0460A9]" /> Student Access Portal
            </button>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <button
              onClick={() => setIsAdminOpen(true)}
              className="flex items-center gap-1.5 text-[#0460A9]/80 hover:text-[#0460A9] font-mono text-sm transition-all cursor-pointer bg-transparent border-none p-0"
            >
              <ShieldAlert size={14} /> Cybotz Admin Portal
            </button>
          </div>
          <p className="text-sm text-[#3E5168] font-mono">
            Innovating STEM & Robotics Education
          </p>
        </div>
      </div>
    </footer>
  );
}
