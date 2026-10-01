/** Formatting shared across the console. Money, dates, distance, ids. */

export function formatMoney(amount, currency = 'INR') {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    // An unrecognised currency code should not blank the figure out.
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

/** Drops a trailing ".0" so an axis reads ₹2K rather than ₹2.0K. */
const trim = (n) => String(Number(n.toFixed(1))).replace(/\.0$/, '');

/**
 * Compact money for a chart axis or a dense cell: ₹1.2L rather than ₹120,000.
 *
 * The scale is written out rather than left to `notation: 'compact'`, which
 * abbreviates a thousand as "T" in en-IN on some browsers — and an axis that
 * labels two thousand rupees "₹2T" is worse than no axis at all. K, L and Cr
 * are what an operator here reads without thinking.
 */
export function compactMoney(amount, currency = 'INR') {
  if (amount == null) return '—';

  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';

  const symbol = CURRENCY_SYMBOL[currency] || `${currency} `;
  const sign = value < 0 ? '-' : '';
  const size = Math.abs(value);

  if (size >= 1_00_00_000) return `${sign}${symbol}${trim(size / 1_00_00_000)}Cr`;
  if (size >= 1_00_000) return `${sign}${symbol}${trim(size / 1_00_000)}L`;
  if (size >= 1_000) return `${sign}${symbol}${trim(size / 1_000)}K`;

  return `${sign}${symbol}${trim(size)}`;
}

const CURRENCY_SYMBOL = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

/** The same treatment for a plain count axis: 1.2K rides, not 1,200. */
export function compactNumber(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';

  const n = Number(value);
  const size = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (size >= 1_00_00_000) return `${sign}${trim(size / 1_00_00_000)}Cr`;
  if (size >= 1_00_000) return `${sign}${trim(size / 1_00_000)}L`;
  if (size >= 1_000) return `${sign}${trim(size / 1_000)}K`;

  return `${sign}${trim(size)}`;
}

export const formatNumber = (value) =>
  value == null ? '—' : new Intl.NumberFormat('en-IN').format(value);

export const formatPercent = (value) => (value == null ? '—' : `${Math.round(value)}%`);

export const formatDistance = (km) => (km == null ? '—' : `${Number(km).toFixed(1)} km`);

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** A chart axis label: 8 Sept. Parsed as local, not UTC. */
export function formatChartDay(iso) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatRelative(value) {
  if (!value) return '—';

  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  const future = seconds < 0;
  const abs = Math.abs(seconds);

  const say = (text) => (future ? `in ${text}` : `${text} ago`);

  if (abs < 45) return future ? 'in a moment' : 'just now';
  if (abs < 90) return say('a minute');
  if (abs < 3600) return say(`${Math.round(abs / 60)} min`);
  if (abs < 7200) return say('an hour');
  if (abs < 86400) return say(`${Math.round(abs / 3600)} hours`);
  if (abs < 172800) return future ? 'tomorrow' : 'yesterday';
  if (abs < 2592000) return say(`${Math.round(abs / 86400)} days`);

  return formatDate(value);
}

/** Time remaining against a deadline, or how long it is overdue. */
export function formatDue(dueAt) {
  if (!dueAt) return { label: '—', overdue: false };

  const ms = new Date(dueAt).getTime() - Date.now();
  const overdue = ms < 0;
  const abs = Math.abs(ms);

  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);

  const span = hours >= 24 ? `${Math.floor(hours / 24)}d` : hours >= 1 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return { label: overdue ? `${span} overdue` : `${span} left`, overdue };
}

export function formatDuration(seconds) {
  if (!seconds) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** Long ids are unreadable in a table; the tail is what distinguishes them. */
export const shortId = (id) => (id ? `…${String(id).slice(-8)}` : '—');

export const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';

/** "Andheri Station, Mumbai, India" → "Andheri Station, Mumbai" */
export function shortAddress(address, parts = 2) {
  if (!address) return '—';
  return address.split(',').slice(0, parts).join(',').trim();
}

export const plural = (count, word, suffix = 's') => `${count} ${word}${count === 1 ? '' : suffix}`;

/** A snake-case enum rendered as a sentence, when there is no label for it. */
export const humanise = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
