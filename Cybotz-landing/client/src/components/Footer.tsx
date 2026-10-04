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
    <footer className="relative z-10 bg-[#0b101d] border-t border-[#1e293b] py-12 md:py-16 mt-auto">
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
            <p className="text-gray-300 text-sm leading-relaxed max-w-sm">
              Hands-on Drone, Electronics, and Robotics training for schools in Bangalore. No AI, no shortcuts, just core fundamentals.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold font-mono mb-4 text-sm uppercase tracking-wider text-cyan-400">Quick Links</h4>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => handleNavigation(link.href)}
                    className="text-gray-300 hover:text-cyan-400 transition-all duration-300 text-sm md:text-base bg-transparent border-none p-0 cursor-pointer"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Core Areas */}
          <div>
            <h4 className="text-white font-bold font-mono mb-4 text-sm uppercase tracking-wider text-cyan-400 font-mono">Ecosystem</h4>
            <ul className="space-y-2.5 text-gray-300 text-sm md:text-base">
              <li>
                <button
                  onClick={() => handleNavigation('/labs')}
                  className="hover:text-cyan-400 transition-all duration-300 text-left bg-transparent border-none p-0 cursor-pointer"
                >
                  STEM School Labs
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('/workshops')}
                  className="hover:text-cyan-400 transition-all duration-300 text-left bg-transparent border-none p-0 cursor-pointer"
                >
                  Drone Engineering
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('/workshops')}
                  className="hover:text-cyan-400 transition-all duration-300 text-left bg-transparent border-none p-0 cursor-pointer"
                >
                  Robotics Bootcamps
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('#reach-us')}
                  className="hover:text-cyan-400 transition-all duration-300 text-left bg-transparent border-none p-0 cursor-pointer"
                >
                  Consultation
                </button>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="text-white font-bold font-mono mb-4 text-sm uppercase tracking-wider text-cyan-400">Follow Us</h4>
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
                      className="w-10 h-10 rounded-lg bg-[#0F172A] border border-[#1e293b] hover:border-cyan-500 hover:text-cyan-400 text-gray-400 flex items-center justify-center transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                      aria-label={`Follow Cybotz on ${link.label}`}
                      title={link.label}
                    >
                      <Icon size={18} />
                    </a>
                    {/* Tooltip */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900 border border-cyan-500/40 rounded-md text-xs font-mono text-cyan-300 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg whitespace-nowrap z-30">
                      {link.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#1e293b] my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-sm text-gray-300">
            <p>© {new Date().getFullYear()} CYBOTZ. All rights reserved.</p>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <button
              onClick={() => handleNavigation('/student')}
              className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-mono text-sm transition-all cursor-pointer bg-transparent border-none p-0"
            >
              <GraduationCap size={15} className="text-cyan-400" /> Student Access Portal
            </button>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <button
              onClick={() => setIsAdminOpen(true)}
              className="flex items-center gap-1.5 text-cyan-400/80 hover:text-cyan-300 font-mono text-sm transition-all cursor-pointer bg-transparent border-none p-0"
            >
              <ShieldAlert size={14} /> Cybotz Admin Portal
            </button>
          </div>
          <p className="text-sm text-gray-400 font-mono">
            Innovating STEM & Robotics Education
          </p>
        </div>
      </div>
    </footer>
  );
}
