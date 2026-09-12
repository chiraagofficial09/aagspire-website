import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ClockWidget } from './ClockWidget';

interface WorkNavbarProps {
  title: string;
  subtitle?: string;
}

export const WorkNavbar: React.FC<WorkNavbarProps> = ({ title, subtitle }) => {
  const { user } = useAuth();

  return (
    <header className="h-16 md:h-20 bg-[#060710]/90 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20 gap-4 border-b border-white/[0.06] shadow-[0_1px_0_0_rgba(255,90,31,0.06)]">
      {/* Page Title & Breadcrumb */}
      <div className="min-w-0">
        <h1 className="page-title text-base md:text-lg truncate flex items-center gap-2">
          <span>{title}</span>
        </h1>
        {subtitle && (
          <p className="page-subtitle hidden sm:block truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* If Employee, render compact Clock In / Out button directly in header */}
        {user?.role === 'employee' && <ClockWidget compact />}

        {/* User Identity Chip */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
          <span
            className="w-2 h-2 rounded-full animate-live-pulse bg-ember shadow-[0_0_8px_rgba(255,90,31,0.6)]"
          />
          <span className="text-xs font-semibold text-white/90 hidden sm:inline tracking-tight">
            {user?.name}
          </span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-white/50 uppercase tracking-wider border border-white/[0.06]">
            {user?.role}
          </span>
        </div>
      </div>
    </header>
  );
};
