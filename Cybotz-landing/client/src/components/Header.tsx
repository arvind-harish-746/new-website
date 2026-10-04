import { NAV_LINKS } from '@/data';
import { Menu, X, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleNavigation = (href: string) => {
    setMobileMenuOpen(false);
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
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0B101D]/95 backdrop-blur-md border-b border-cyan-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
          : 'bg-[#0F172A]/85 backdrop-blur-sm border-b border-[#1E293B]'
      }`}
    >
      <div className="container flex items-center justify-between h-20 px-4 md:px-8">
        {/* Logo / Brand */}
        <button
          onClick={() => handleNavigation('/')}
          className="flex items-center group bg-transparent border-none p-0 cursor-pointer"
          aria-label="Cybotz STEM Home"
          title="Cybotz Robotics & Drone Academy"
        >
          <img
            src="/logos/cybotz_transparent.png"
            alt="Cybotz"
            className="h-10 md:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </button>

        {/* Desktop Navigation (>= 1024px) */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8" aria-label="Main desktop navigation">
          {NAV_LINKS.map((link) => {
            const isActive = location === link.href;
            return (
              <button
                key={link.href}
                onClick={() => handleNavigation(link.href)}
                className={`relative inline-flex flex-col items-center justify-center text-sm xl:text-base font-semibold font-mono tracking-wider transition-all duration-300 cursor-pointer bg-transparent border-none outline-none select-none p-0 whitespace-nowrap ${
                  isActive
                    ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]'
                    : 'text-gray-300 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{link.label}</span>
                {isActive && (
                  <span className="w-full h-[2px] mt-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_#00f0ff,0_0_14px_rgba(0,240,255,0.8)] pointer-events-none" />
                )}
              </button>
            );
          })}
          <button
            onClick={() => handleNavigation('#reach-us')}
            className="relative inline-flex flex-col items-center justify-center text-sm xl:text-base font-semibold font-mono tracking-wider transition-all duration-300 cursor-pointer text-gray-300 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] bg-transparent border-none outline-none select-none p-0 whitespace-nowrap"
          >
            <span>Contact</span>
          </button>
        </nav>

        {/* Desktop CTA Button (>= 1024px) */}
        <button
          onClick={() => handleNavigation('#reach-us')}
          className="hidden lg:flex items-center gap-2 px-5 xl:px-6 py-2.5 bg-cyan-500 text-[#0F172A] font-bold font-mono text-sm xl:text-base tracking-wider rounded-lg hover:bg-cyan-400 transition-all duration-300 glow-cyan cursor-pointer whitespace-nowrap flex-shrink-0"
          aria-label="Book Consultation"
        >
          <Calendar size={16} /> Book Consultation
        </button>

        {/* Mobile & Tablet Controls (< 1024px) */}
        <div className="flex items-center gap-2.5 sm:gap-3 lg:hidden">
          {/* Tablet Consultation Button (visible on tablet screens >= 480px) */}
          <button
            onClick={() => handleNavigation('#reach-us')}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-cyan-500 text-[#0F172A] font-bold font-mono text-xs tracking-wider rounded-lg hover:bg-cyan-400 transition-all duration-300 glow-cyan cursor-pointer whitespace-nowrap shadow-[0_0_15px_rgba(0,240,255,0.3)] flex-shrink-0"
            aria-label="Book Consultation"
          >
            <Calendar size={14} /> Book Consultation
          </button>

          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-all duration-300 cursor-pointer"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer & Backdrop (< 1024px) */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 top-20 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 lg:hidden bg-[#0B101D]/95 backdrop-blur-xl border-t border-cyan-500/20 shadow-2xl animate-fade-in">
            <nav className="container max-w-lg mx-auto py-5 flex flex-col gap-1.5 px-4 md:px-8" aria-label="Mobile and tablet navigation">
              {NAV_LINKS.map((link) => {
                const isActive = location === link.href;
                return (
                  <button
                    key={link.href}
                    onClick={() => handleNavigation(link.href)}
                    className={`relative text-left text-sm font-semibold font-mono tracking-wider transition-all duration-200 py-3 px-4 rounded-xl cursor-pointer bg-transparent border-none outline-none select-none flex items-center justify-between ${
                      isActive
                        ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(0,240,255,0.8)] bg-cyan-500/10 border border-cyan-500/30'
                        : 'text-gray-300 hover:text-cyan-400 hover:bg-slate-900/40'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => handleNavigation('#reach-us')}
                className="text-left text-sm font-semibold font-mono tracking-wider text-gray-300 hover:text-cyan-400 hover:bg-slate-900/40 py-3 px-4 rounded-xl cursor-pointer bg-transparent border-none outline-none select-none"
              >
                Contact
              </button>
              <button
                onClick={() => handleNavigation('#reach-us')}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3.5 bg-cyan-500 text-[#0F172A] font-bold font-mono tracking-wider rounded-xl hover:bg-cyan-400 transition-all duration-300 glow-cyan cursor-pointer text-center whitespace-nowrap"
              >
                <Calendar size={16} /> Book Consultation
              </button>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
