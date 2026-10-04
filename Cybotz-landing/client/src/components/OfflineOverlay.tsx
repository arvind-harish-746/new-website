import React, { useEffect, useState } from "react";
import { RefreshCw, WifiOff, CheckCircle2 } from "lucide-react";
import { WalleRobot } from "@/components/ui/walle-robot";

interface OfflineOverlayProps {
  onRetry?: () => void;
  isStandalonePage?: boolean;
}

export default function OfflineOverlay({ onRetry, isStandalonePage = false }: OfflineOverlayProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setReconnected(true);
      setTimeout(() => {
        if (onRetry) {
          onRetry();
        } else {
          window.location.reload();
        }
      }, 1200);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [onRetry]);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        setReconnected(true);
        setTimeout(() => {
          if (onRetry) {
            onRetry();
          } else {
            window.location.reload();
          }
        }, 800);
      } else {
        setIsRetrying(false);
      }
    }, 600);
  };

  return (
    <div
      className={`${
        isStandalonePage ? "min-h-screen" : "fixed inset-0 z-[99999]"
      } bg-[#0F172A] text-slate-200 flex flex-col items-center justify-center p-4 overflow-hidden select-none font-sans cockroach-cursor`}
      style={{
        cursor:
          "url('https://s3-us-west-2.amazonaws.com/s.cdpn.io/28963/cockroach%20(2).ico'), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M14 6 C11 6 10 9 10 14 C10 19 11 22 14 22 C17 22 18 19 18 14 C18 9 17 6 14 6 Z' fill='%23b45309' stroke='%23451a03' stroke-width='1.2'/%3E%3Cpath d='M10 10 L4 7 M10 14 L3 14 M10 18 L4 21 M18 10 L24 7 M18 14 L25 14 M18 18 L24 21' stroke='%23451a03' stroke-width='1.2' stroke-linecap='round'/%3E%3Cpath d='M12 7 Q9 2 4 1 M16 7 Q19 2 24 1' stroke='%23451a03' stroke-width='1' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\") 14 14, default",
      }}
    >
      {/* Ambient background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0, 240, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 240, 255, 0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 text-center max-w-lg w-full py-8">
        {/* Connection Lost Badge */}
        {reconnected ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs uppercase tracking-widest mb-4 animate-bounce">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Connection Restored — Reloading...
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-xs uppercase tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />
            <WifiOff className="w-3.5 h-3.5" />
            Connection Lost
          </div>
        )}

        {/* Interactive WALL-E Robot */}
        <div className="my-2">
          <WalleRobot showHint={true} />
        </div>

        {/* Title */}
        <h1 className="font-mono text-3xl sm:text-4xl font-bold text-white tracking-wide mt-2 mb-3">
          You're Offline
        </h1>

        {/* Subtitle */}
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6 max-w-md mx-auto">
          It looks like your device lost its connection to the internet.
          <br className="hidden sm:inline" /> Check your Wi-Fi or mobile data and try again.
        </p>

        {/* Action Button */}
        <button
          onClick={handleRetry}
          disabled={isRetrying || reconnected}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 text-slate-950 font-mono font-bold text-xs sm:text-sm uppercase tracking-wider rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_24px_rgba(0,240,255,0.4)] cursor-pointer"
        >
          <RefreshCw size={16} className={isRetrying ? "animate-spin" : ""} />
          {reconnected
            ? "Reconnected!"
            : isRetrying
            ? "Checking Signal..."
            : "Retry Connection"}
        </button>
      </div>
    </div>
  );
}
