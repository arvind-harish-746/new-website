import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { useLocation } from 'wouter';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const toggleVisibility = () => {
      const scrolled =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      if (scrolled > 80) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Run on initial load and route changes
    toggleVisibility();

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    document.addEventListener('scroll', toggleVisibility, { passive: true });

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
      document.removeEventListener('scroll', toggleVisibility);
    };
  }, [location]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    if (document.documentElement) {
      document.documentElement.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-[999] group flex flex-col items-center transition-all duration-300 ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
    >
      {/* Floating Hover Tooltip with Arrow Pointer */}
      <div className="absolute -top-10 px-2.5 py-1 bg-[#090D16] border border-cyan-500/50 text-[#0460A9] text-[11px] font-mono font-medium rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.7)] opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 whitespace-nowrap">
        Back to top
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#090D16] border-r border-b border-cyan-500/50 rotate-45" />
      </div>

      {/* Floating Button (Arrowmark only) */}
      <button
        onClick={scrollToTop}
        className="w-11 h-11 rounded-full bg-white/95 border border-cyan-400/60 text-[#0460A9] hover:text-[#0460A9] hover:bg-[#ff8614] hover:border-cyan-300 flex items-center justify-center transition-all duration-300 shadow-[0_10px_24px_rgba(249,116,5,0.2)] hover:shadow-[0_10px_24px_rgba(16,32,51,0.08)] hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
        aria-label="Scroll to top of page"
        title="Back to top"
      >
        <ArrowUp className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
      </button>
    </div>
  );
}
