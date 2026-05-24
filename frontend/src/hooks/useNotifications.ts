import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { LawyerNotification } from '../types/lawyer-dashboard';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<LawyerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use a ref to track if we're mounted to prevent state updates on unmounted components
  const mounted = useRef(true);

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/api/v1/lawyers/me/notifications');
      if (mounted.current && Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch {
      // Silently fail if not authenticated properly or backend down
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.user_metadata?.user_role !== 'lawyer') {
      setIsLoading(false);
      return;
    }

    mounted.current = true;
    
    // Initial fetch
    fetchNotifications();

    // 1. Try to subscribe to Supabase Realtime
    const channel = supabase
      .channel('lawyer_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lawyer_notifications',
          filter: `lawyer_auth_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (mounted.current) {
            const newNotif = payload.new as LawyerNotification;
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    // 2. Fallback polling (every 30s) in case Realtime fails/isn't enabled
    const pollInterval = setInterval(fetchNotifications, 30000);

    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    try {
      await api.patch(`/api/v1/lawyers/me/notifications/${id}/read`, {});
    } catch {
      // Revert on failure
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    
    // Process sequentially to not hammer the API
    for (const n of unread) {
      try {
        await api.patch(`/api/v1/lawyers/me/notifications/${n.id}/read`, {});
      } catch {
        // ignore individual failures
      }
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
}
