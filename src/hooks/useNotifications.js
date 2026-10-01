import { useCallback, useEffect, useState } from 'react';
import * as notificationApi from '@/services/notification.api';
import { useSocketEvents } from './useSocket';
import { useAuth } from './useAuth';
import { SOCKET_EVENTS } from '@/constants/socketEvents';

/**
 * The notification feed. Records are written server-side as ride events happen,
 * so this is a history of real events — the socket only tells us to look again.
 */
export function useNotifications() {
  const [state, setState] = useState({ notifications: [], unread: 0, loaded: false, error: null });

  const load = useCallback(async () => {
    try {
      const data = await notificationApi.listNotifications({ limit: 50 });
      setState({ ...data, loaded: true, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loaded: true, error: err.message }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvents({ [SOCKET_EVENTS.NOTIFICATION_NEW]: () => load() }, [load]);

  const markRead = useCallback(async (id) => {
    // Optimistic: the badge should drop the moment it is tapped.
    setState((s) => ({
      ...s,
      unread: Math.max(s.unread - 1, 0),
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    }));
    try {
      await notificationApi.markRead(id);
    } catch {
      load();
    }
  }, [load]);

  const markAllRead = useCallback(async () => {
    setState((s) => ({ ...s, unread: 0, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    try {
      await notificationApi.markAllRead();
    } catch {
      load();
    }
  }, [load]);

  return { ...state, reload: load, markRead, markAllRead };
}

/** Just the badge count, for the tab bar. */
export function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    if (!isAuthenticated) return;
    notificationApi
      .listNotifications({ limit: 1 })
      .then((d) => setUnread(d.unread))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useSocketEvents({ [SOCKET_EVENTS.NOTIFICATION_NEW]: refresh }, [refresh]);

  return isAuthenticated ? unread : 0;
}
