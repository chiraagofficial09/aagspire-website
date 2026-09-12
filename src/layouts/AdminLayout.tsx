import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/work/Sidebar';
import { NotificationBell } from '../components/work/NotificationBell';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row antialiased bg-[#050507] text-white">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0">
        {/* Desktop Top Workspace Utility Bar */}
        <header className="hidden md:flex h-14 px-8 items-center justify-between border-b border-white/[0.04] shrink-0">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="text-zinc-400 font-medium">Aagspire</span>
            <span>/</span>
            <span className="text-zinc-300">Admin Workspace</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
