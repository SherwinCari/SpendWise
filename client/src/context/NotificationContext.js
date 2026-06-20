import React, { createContext, useContext, useState, useCallback } from 'react';
import * as notificationsApi from '../api/notificationsApi';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await notificationsApi.list();
      const data = response.data?.data || response.data?.notifications || response.data || [];
      const notifArray = Array.isArray(data) ? data : [];
      setNotifications(notifArray);
      const unread = notifArray.filter((n) => !n.is_read && !n.isRead).length;
      setUnreadCount(unread);
      return notifArray;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to fetch notifications.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id) => {
    setError(null);
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, is_read: true, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to mark notification as read.';
      setError(message);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    clearError,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationContext;
