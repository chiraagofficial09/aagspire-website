import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  FileText,
  FolderKanban,
  IndianRupee,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  Wallet,
  Building2,
  Trash2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useNotifications, NotificationItem } from '../../context/NotificationContext';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return 'Just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function getNotificationIcon(notification: NotificationItem) {
  const type = notification.type || '';
  const title = (notification.title || '').toLowerCase();
  const message = (notification.message || '').toLowerCase();

  // 1. Check Out / Clock Out
  if (
    title.includes('clocked out') ||
    title.includes('clock out') ||
    title.includes('check out') ||
    title.includes('checked out') ||
    message.includes('clocked out')
  ) {
    return {
      icon: LogOut,
      category: 'attendance',
      color: 'text-zinc-400',
      bg: 'bg-white/5 border-white/10',
    };
  }

  // 2. Check In / Clock In
  if (
    type === 'attendance' ||
    title.includes('clocked in') ||
    title.includes('clock in') ||
    title.includes('check in') ||
    title.includes('checked in') ||
    message.includes('clocked in')
  ) {
    const isLate = title.includes('late') || message.includes('late');
    if (isLate) {
      return {
        icon: Clock,
        category: 'attendance',
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/20',
      };
    }
    return {
      icon: LogIn,
      category: 'attendance',
      color: 'text-ember',
      bg: 'bg-ember/10 border-ember/20',
    };
  }

  // 3. Payment Received / Recorded
  if (
    type === 'payment' ||
    title.includes('payment') ||
    message.includes('received ₹') ||
    message.includes('payment of ₹')
  ) {
    return {
      icon: IndianRupee,
      category: 'payment',
      color: 'text-white',
      bg: 'bg-white/10 border-white/20',
    };
  }

  // 4. Settlements / Disbursements
  if (
    type === 'settlement' ||
    title.includes('settlement') ||
    title.includes('disbursement') ||
    title.includes('payout')
  ) {
    return {
      icon: Wallet,
      category: 'payment',
      color: 'text-white',
      bg: 'bg-white/10 border-white/20',
    };
  }

  // 5. Work Logs
  if (type === 'work_log' || title.includes('work log')) {
    if (title.includes('approved')) {
      return {
        icon: CheckCircle2,
        category: 'work_log',
        color: 'text-ember',
        bg: 'bg-ember/10 border-ember/20',
      };
    }
    if (title.includes('rejected') || title.includes('revision') || title.includes('changes')) {
      return {
        icon: AlertCircle,
        category: 'work_log',
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/20',
      };
    }
    return {
      icon: FileText,
      category: 'work_log',
      color: 'text-zinc-300',
      bg: 'bg-white/5 border-white/10',
    };
  }

  // 6. Projects
  if (type === 'project' || title.includes('project')) {
    return {
      icon: FolderKanban,
      category: 'project',
      color: 'text-zinc-300',
      bg: 'bg-white/5 border-white/10',
    };
  }

  // 7. Clients
  if (type === 'client' || title.includes('client')) {
    return {
      icon: Building2,
      category: 'project',
      color: 'text-zinc-300',
      bg: 'bg-white/5 border-white/10',
    };
  }

  // 8. Staff / Employees
  if (type === 'employee' || title.includes('employee') || title.includes('staff')) {
    return {
      icon: Sparkles,
      category: 'attendance',
      color: 'text-ember',
      bg: 'bg-ember/10 border-ember/20',
    };
  }

  return {
    icon: Bell,
    category: 'all',
    color: 'text-zinc-400',
    bg: 'bg-white/5 border-white/10',
  };
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'payment' | 'attendance' | 'work_log'>('all');
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearRead,
  } = useNotifications();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  // Filtered notifications list
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;

    return notifications.filter((n) => {
      const config = getNotificationIcon(n);
      return config.category === activeFilter;
    });
  }, [notifications, activeFilter]);

  const hasReadNotifications = notifications.some((n) => n.isRead);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Minimal Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/15 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5A1F] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5A1F]" />
          </span>
        )}
      </button>

      {/* Popover Dropdown - Sleek Minimal & Premium Dark Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-84 sm:w-[400px] bg-[#0c0d12] border border-white/[0.1] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF5A1F]/15 text-[#FF5A1F] text-[10px] font-mono font-bold border border-[#FF5A1F]/25">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>Mark read</span>
              </button>
            )}
          </div>

          {/* Minimalist Filter Tabs */}
          <div className="px-3.5 py-2 border-b border-white/[0.04] flex items-center gap-1.5 bg-white/[0.01]">
            {[
              { id: 'all', label: 'All' },
              { id: 'payment', label: 'Payments' },
              { id: 'attendance', label: 'Check In/Out' },
              { id: 'work_log', label: 'Work' },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-white/10 text-white font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Notifications Scrollable List */}
          <div className="max-h-84 overflow-y-auto custom-scrollbar divide-y divide-white/[0.04]">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center px-4">
                <Bell className="w-7 h-7 text-zinc-600 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium text-zinc-300">No notifications</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {activeFilter === 'all'
                    ? 'All caught up right now.'
                    : `No ${activeFilter.replace('_', ' ')} notifications.`}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const iconConfig = getNotificationIcon(notification);
                const IconComponent = iconConfig.icon;

                return (
                  <div
                    key={notification._id}
                    onClick={() => handleItemClick(notification)}
                    className={`px-4 py-3.5 transition-colors cursor-pointer flex items-start gap-3.5 group ${
                      notification.isRead ? 'hover:bg-white/[0.02]' : 'bg-[#FF5A1F]/[0.03] hover:bg-[#FF5A1F]/[0.06]'
                    }`}
                  >
                    {/* Distinct Color-Coded Icon Box */}
                    <div
                      className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border ${iconConfig.bg} ${iconConfig.color} mt-0.5 shadow-sm`}
                    >
                      <IconComponent className="w-4 h-4 shrink-0" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs font-semibold truncate ${
                            notification.isRead ? 'text-zinc-300' : 'text-white'
                          }`}
                        >
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-zinc-500 shrink-0 font-medium whitespace-nowrap">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed font-normal">
                        {notification.message}
                      </p>
                    </div>

                    {!notification.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shrink-0 mt-2 shadow-[0_0_6px_#FF5A1F]" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          {hasReadNotifications && (
            <div className="px-4 py-2.5 border-t border-white/[0.04] bg-white/[0.01] flex items-center justify-center">
              <button
                onClick={clearRead}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer py-0.5"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear read notifications</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
