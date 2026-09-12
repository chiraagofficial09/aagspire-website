import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export interface NotificationItem {
  _id: string;
  recipient?: string;
  role?: 'admin' | 'employee' | 'all';
  type: 'work_log' | 'project' | 'payment' | 'settlement' | 'employee' | 'client' | 'attendance' | 'system';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const res = await api.get('/notifications');
      const items = res.data?.data || [];
      const unread = typeof res.data?.unreadCount === 'number' ? res.data.unreadCount : items.filter((n: any) => !n.isRead).length;
      setNotifications(items);
      setUnreadCount(unread);
    } catch (err) {
      // Silently ignore background polling errors
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch and auto-polling every 20 seconds while user is authenticated
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 20000);

    const handleFocus = () => {
      fetchNotifications();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    // Optimistic local update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      // Refresh on error
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    // Optimistic local update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await api.patch('/notifications/mark-all-read');
    } catch (err) {
      fetchNotifications();
    }
  };

  const clearRead = async () => {
    // Optimistic local update
    setNotifications((prev) => prev.filter((n) => !n.isRead));

    try {
      await api.delete('/notifications/clear-read');
    } catch (err) {
      fetchNotifications();
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        clearRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
