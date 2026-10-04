import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AdminModal } from "@/components/AdminModal";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Portal() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  usePageMeta("Management Portal | Cybotz", "Administrative access portal for Cybotz team.");

  const handleClose = () => {
    setIsOpen(false);
    setLocation("/");
  };

  useEffect(() => {
    try {
      const role = localStorage.getItem("cybotz_admin_role");
      if (role === "student") {
        setLocation("/student");
        return;
      }
    } catch {}
    setIsOpen(true);
  }, [setLocation]);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#070C16] text-white">
      <Header />
      <main className="flex-grow flex items-center justify-center pt-24 pb-16 px-4">
        <div className="text-center space-y-4 max-w-md mx-auto">
          <h1 className="text-2xl font-bold font-mono text-cyan-300">Cybotz Management Portal</h1>
          <p className="text-sm text-gray-400 font-mono">
            The security portal window is open. If you closed it, click below to reopen.
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-sm transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer"
          >
            Open Portal
          </button>
        </div>
      </main>
      <Footer />
      <AdminModal isOpen={isOpen} onClose={handleClose} />
    </div>
  );
}
