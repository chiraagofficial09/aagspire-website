import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#07080c] text-white flex flex-col justify-between relative overflow-hidden">
      {/* Ambient background glows matching mockup */}
      <div className="absolute -top-32 -right-32 w-[450px] h-[450px] bg-[#FF5A1F]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[450px] h-[450px] bg-[#FF5A1F]/8 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <header className="p-6 md:p-8 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center gap-3 group cursor-pointer">
          <img
            src="/Aagspire_Logo.png"
            alt="Aagspire"
            className="h-7 w-auto object-contain transition-opacity group-hover:opacity-90"
          />
          <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-semibold border-l border-white/10 pl-2.5">
            WORKSPACE
          </span>
        </Link>

        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white transition-colors px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/15 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Main Website</span>
        </Link>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md">
          {children || <Outlet />}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-[10px] font-mono text-white/20 z-10 tracking-wider">
        &copy; {new Date().getFullYear()} Aagspire Creative Studio. Internal Workspace for Authorized Personnel Only.
      </footer>
    </div>
  );
};
