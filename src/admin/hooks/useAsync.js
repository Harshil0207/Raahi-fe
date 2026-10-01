import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs a fetch and tracks its state, for the many screens that load one thing.
 *
 * Two details that matter on a console. A refetch keeps the previous data on
 * screen while the new page loads, so a table does not flash empty every time a
 * filter changes. And a response that arrives after a newer request was already
 * sent is discarded, so fast filter changes cannot leave the wrong page showing.
 */
export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(immediate);

  // Each run takes a ticket; only the newest one is allowed to write state.
  const ticket = useRef(0);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  const run = useCallback(async () => {
    const mine = ++ticket.current;
    setLoading(true);

    try {
      const result = await fnRef.current();
      if (mine !== ticket.current) return null;
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      if (mine === ticket.current) setError(err);
      return null;
    } finally {
      if (mine === ticket.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, immediate, ...deps]);

  return { data, error, loading, refetch: run, setData };
}
