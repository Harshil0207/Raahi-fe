import { useEffect, useState } from 'react';

/**
 * Holds a value still until typing stops.
 *
 * Every list screen searches server-side, so without this each keystroke would
 * be a query.
 */
export function useDebouncedValue(value, delay = 350) {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return settled;
}
