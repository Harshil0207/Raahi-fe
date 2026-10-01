import { useCallback, useEffect, useState } from 'react';
import * as complaintApi from '@/services/complaint.api';
import { getSocket } from '@/socket/socket';
import { SOCKET_EVENTS } from '@/constants/socketEvents';

/** The reporter's own complaints. Same hook for a customer and a rider. */
export function useComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await complaintApi.list({ limit: 50 });
      setComplaints(result.complaints);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // A support reply should appear without the person pulling to refresh.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const onMessage = () => load();
    socket.on(SOCKET_EVENTS.COMPLAINT_MESSAGE, onMessage);

    return () => socket.off(SOCKET_EVENTS.COMPLAINT_MESSAGE, onMessage);
  }, [load]);

  return { complaints, loaded, error, reload: load };
}

/** One complaint and its thread. */
export function useComplaint(complaintId) {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!complaintId) return;

    try {
      setData(await complaintApi.detail(complaintId));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoaded(true);
    }
  }, [complaintId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const onMessage = (payload) => {
      if (String(payload.complaintId) === String(complaintId)) load();
    };
    socket.on(SOCKET_EVENTS.COMPLAINT_MESSAGE, onMessage);

    return () => socket.off(SOCKET_EVENTS.COMPLAINT_MESSAGE, onMessage);
  }, [complaintId, load]);

  const reply = useCallback(
    async (message) => {
      const stored = await complaintApi.reply(complaintId, message);
      // Appended locally so the reply appears at once; the reload behind it
      // picks up any status change the server made.
      setData((current) =>
        current ? { ...current, messages: [...current.messages, stored] } : current
      );
      load();
      return stored;
    },
    [complaintId, load]
  );

  return { ...(data || {}), loaded, error, reload: load, reply };
}

/**
 * The categories the platform currently offers this role.
 *
 * Fetched rather than hard-coded, because an admin can change the list — a
 * picker offering a category the server no longer accepts would fail on submit.
 */
export function useComplaintCategories() {
  const [categories, setCategories] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    complaintApi
      .categories()
      .then((result) => !cancelled && setCategories(result.categories || []))
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loaded };
}

/** Unread support replies, for the badge on the help and profile entries. */
export function useComplaintUnread() {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    complaintApi
      .unread()
      .then((result) => setUnread(result.unread || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    socket.on(SOCKET_EVENTS.COMPLAINT_MESSAGE, refresh);
    return () => socket.off(SOCKET_EVENTS.COMPLAINT_MESSAGE, refresh);
  }, [refresh]);

  return { unread, refresh };
}
