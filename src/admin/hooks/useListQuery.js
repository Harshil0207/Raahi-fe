import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * Filters, search and paging for a list screen, held in the URL.
 *
 * In the URL rather than in state so a filtered view can be shared or
 * bookmarked — "the overdue urgent complaints" is a link an operator sends to a
 * colleague, and losing it on refresh is the kind of small friction that makes a
 * console tiring.
 *
 * Search is debounced for the request but written to the URL immediately, so
 * typing stays responsive while the query waits.
 */
export function useListQuery(defaults = {}) {
  const [params, setParams] = useSearchParams();
  const [searchDraft, setSearchDraft] = useState(() => params.get('search') || '');
  const debouncedSearch = useDebouncedValue(searchDraft, 350);

  const read = useCallback(
    (key, fallback) => {
      const value = params.get(key);
      return value === null || value === '' ? fallback : value;
    },
    [params]
  );

  const page = Number(read('page', 1)) || 1;

  /** Changing a filter resets to page 1; a filtered page 7 rarely exists. */
  const setFilter = useCallback(
    (key, value) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value === '' || value == null) next.delete(key);
          else next.set(key, String(value));
          next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const setPage = useCallback(
    (value) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value <= 1) next.delete('page');
          else next.set('page', String(value));
          return next;
        },
        { replace: true }
      );
      // A new page starts at the top, as a paged table should.
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [setParams]
  );

  const setSearch = useCallback(
    (value) => {
      setSearchDraft(value);
      setFilter('search', value);
    },
    [setFilter]
  );

  const reset = useCallback(() => {
    setSearchDraft('');
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);

  // What goes to the API: the debounced search, not the draft.
  const query = useMemo(() => {
    const out = { page, ...defaults };

    for (const [key, value] of params.entries()) {
      if (key === 'search' || key === 'page') continue;
      if (value !== '') out[key] = value;
    }

    if (debouncedSearch.trim()) out.search = debouncedSearch.trim();
    else delete out.search;

    return out;
    // `defaults` is a literal at the call site; spreading it into the dep list
    // would rebuild the query on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, page, debouncedSearch]);

  return {
    query,
    page,
    setPage,
    search: searchDraft,
    setSearch,
    read,
    setFilter,
    reset,
    /** True while the debounce has not caught up, so the table can dim. */
    searching: searchDraft.trim() !== debouncedSearch.trim()
  };
}
