import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/work/Sidebar';
import { NotificationBell } from '../components/work/NotificationBell';

export const EmployeeLayout: React.FC = () => {
  const location = useLocation();
  const isDashboard =
    location.pathname === '/employee/dashboard' ||
    location.pathname === '/employee' ||
    location.pathname === '/employee/';

  return (
    <div className="min-h-screen bg-[#07080c] text-white flex flex-col md:flex-row antialiased">
      <Sidebar role="employee" />
      <div className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0">
        {!isDashboard && (
          <header className="hidden md:flex h-14 px-8 items-center justify-end border-b border-white/[0.04] shrink-0">
            <div className="flex items-center gap-3">
              <NotificationBell />
            </div>
          </header>
        )}

        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
