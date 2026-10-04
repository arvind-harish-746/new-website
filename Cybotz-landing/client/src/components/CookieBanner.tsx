import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cybotz_cookie_consent';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        // Delay slightly for smooth page entry
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    } catch {}
    setIsVisible(false);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'dismissed');
    } catch {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-50 p-4 bg-[#0B101D]/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_30px_rgba(0,240,255,0.15)] backdrop-blur-md font-mono text-white animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-2 text-xs flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-cyan-300 text-sm">Privacy & Session Storage</h4>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              aria-label="Dismiss cookie notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-gray-300 leading-relaxed text-[11px] font-sans">
            We use essential local storage and security tokens to enable trial session booking, preserve your preferences, and protect owner portal sessions.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleAccept}
              className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-[0_0_10px_rgba(0,240,255,0.3)] cursor-pointer"
            >
              Accept All
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg text-xs transition-colors cursor-pointer"
            >
              Essential Only
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
