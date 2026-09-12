import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FileCheck2,
  CalendarCheck,
  CreditCard, 
  Percent,
  ReceiptText,
  BarChart3,
  Settings,
  Clock,
  FileText,
  UserCircle,
  LogOut,
  X,
  Menu,
  Folder,
  Calendar,
  User,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface SidebarProps {
  role: 'admin' | 'employee';
}

// Section label for grouping nav items
const SectionLabel: React.FC<{ text: string }> = ({ text }) => (
  <div className="pt-6 pb-2 px-3.5">
    <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-500">{text}</span>
  </div>
);

// Reusable nav item component matching the minimal reference design
const NavItem: React.FC<{
  item: { label: string; path: string; icon: React.ElementType };
  onNavigate: () => void;
}> = ({ item, onNavigate }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
          isActive
            ? 'before:absolute before:left-0 before:inset-y-1.5 before:w-1 before:bg-[#FF5A1F] before:rounded-r bg-[#181313] text-[#FF5A1F] font-semibold'
            : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
        }`
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/work/login');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#07080c] border-r border-white/[0.06] select-none">
      {/* Brand Header */}
      <div className="h-20 px-6 flex items-center justify-between shrink-0">
        <NavLink
          to={role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'}
          className="flex items-center gap-2 select-none group py-1"
        >
          <img
            src="/Aagspire_Logo.png"
            alt="Aagspire"
            className="h-7 w-auto object-contain transition-opacity duration-200 group-hover:opacity-90"
          />
        </NavLink>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white bg-white/5 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav Items Scrollable List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-1 custom-scrollbar">
        {role === 'admin' ? (
          <>
            {/* Primary Navigation */}
            <NavItem item={{ label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard }} onNavigate={() => setMobileOpen(false)} />
            <NavItem item={{ label: 'Employees', path: '/admin/employees', icon: Users }} onNavigate={() => setMobileOpen(false)} />
            <NavItem item={{ label: 'Clients', path: '/admin/clients', icon: Building2 }} onNavigate={() => setMobileOpen(false)} />
            <NavItem item={{ label: 'Projects', path: '/admin/projects', icon: Briefcase }} onNavigate={() => setMobileOpen(false)} />
            <NavItem item={{ label: 'Work logs', path: '/admin/work-logs', icon: FileCheck2 }} onNavigate={() => setMobileOpen(false)} />
            <NavItem item={{ label: 'Attendance', path: '/admin/attendance', icon: CalendarCheck }} onNavigate={() => setMobileOpen(false)} />

            {/* FINANCE */}
            <SectionLabel text="FINANCE" />
            <NavItem item={{ label: 'Payments', path: '/admin/payments', icon: CreditCard }} onNavigate={() => setMobileOpen(false)} />
            <NavItem item={{ label: 'Commission', path: '/admin/commissions', icon: Percent }} onNavigate={() => setMobileOpen(false)} />
            <NavItem item={{ label: 'Receipts', path: '/admin/receipts', icon: ReceiptText }} onNavigate={() => setMobileOpen(false)} />

            {/* INSIGHTS */}
            <SectionLabel text="INSIGHTS" />
            <NavItem item={{ label: 'Analytics', path: '/admin/analytics', icon: BarChart3 }} onNavigate={() => setMobileOpen(false)} />

            {/* SYSTEM */}
            <div className="pt-2">
              <NavItem item={{ label: 'Settings', path: '/admin/settings', icon: Settings }} onNavigate={() => setMobileOpen(false)} />
            </div>
          </>
        ) : (
          /* Employee Links matching exact mockup */
          <>
            <NavItem item={{ label: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard }} onNavigate={() => setMobileOpen(false)} />
            <NavItem item={{ label: 'My Projects', path: '/employee/projects', icon: Folder }} onNavigate={() => setMobileOpen(false)} />
            <NavItem item={{ label: 'Work Logs', path: '/employee/work', icon: Clock }} onNavigate={() => setMobileOpen(false)} />
            <NavItem item={{ label: 'Attendance', path: '/employee/attendance', icon: Calendar }} onNavigate={() => setMobileOpen(false)} />
            <NavItem item={{ label: 'Reports', path: '/employee/reports', icon: BarChart3 }} onNavigate={() => setMobileOpen(false)} />
            <NavItem item={{ label: 'Profile', path: '/employee/profile', icon: User }} onNavigate={() => setMobileOpen(false)} />
          </>
        )}
      </div>

      {/* Footer Logout Button matching mockup */}
      <div className="p-4 shrink-0 border-t border-white/[0.04]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Hamburger Toggle Bar */}
      <div className="md:hidden fixed top-0 inset-x-0 h-16 bg-[#050507] border-b border-white/[0.06] z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/Aagspire_Logo.png"
            alt="Aagspire"
            className="h-6 w-auto object-contain"
          />
          <span className="text-[8px] uppercase tracking-[0.2em] text-zinc-500 font-semibold border-l border-white/10 pl-2">
            WORKSPACE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-60 shrink-0 h-screen sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[85vw] h-full z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
