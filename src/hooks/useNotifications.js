import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const unreadNotifications = notifications.filter(n => !n.read_at);
  const historyNotifications = notifications.filter(n => n.read_at);

  const fetchUnreadNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select(`
          *,
          notification_reads (
            read_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      const formatted = (data || []).map(n => ({
        ...n,
        read_at: n.notification_reads?.[0]?.read_at || null
      }));

      setNotifications(formatted);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadNotifications();
  }, [fetchUnreadNotifications]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newNotif = { ...payload.new, read_at: null };
        setNotifications(prev => [newNotif, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notificationId) => {
    if (!user) return;

    try {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId 
          ? { ...n, read_at: new Date().toISOString() } 
          : n
      ));

      const { error: insertError } = await supabase
        .from('notification_reads')
        .insert({
          notification_id: notificationId,
          user_id: user.id
        });
        
      if (insertError && insertError.code !== '23505') { 
        throw insertError;
      }
    } catch (err) {
      console.error('Error marking as read:', err);
      fetchUnreadNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadNotifications.length === 0) return;

    try {
      const now = new Date().toISOString();
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || now })));

      const reads = unreadNotifications.map(n => ({
        notification_id: n.id,
        user_id: user.id
      }));

      const { error: bulkError } = await supabase
        .from('notification_reads')
        .insert(reads);

      if (bulkError && bulkError.code !== '23505') throw bulkError;
    } catch (err) {
      console.error('Error marking all as read:', err);
      fetchUnreadNotifications();
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    try {
      const readIds = historyNotifications.map(n => n.id);
      if(readIds.length > 0) {
        setNotifications(prev => prev.filter(n => !n.read_at));
        await supabase.from('notifications').delete().in('id', readIds);
      }
    } catch(err) {
      console.error('Error clearing history:', err);
      fetchUnreadNotifications();
    }
  };

  return {
    unreadNotifications,
    historyNotifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    clearHistory,
    refetch: fetchUnreadNotifications
  };
};