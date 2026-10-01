const CURRENCY_SYMBOL = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

export function formatMoney(amount, currency = 'INR') {
  if (amount == null || Number.isNaN(Number(amount))) return '—';

  const symbol = CURRENCY_SYMBOL[currency] || `${currency} `;
  const value = Number(amount);
  // Whole rupees read better on a fare; paise only appear when they exist.
  const body = Number.isInteger(value) ? value.toLocaleString('en-IN') : value.toFixed(2);

  return `${symbol}${body}`;
}

export function formatDistance(km) {
  if (km == null) return '—';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function formatDuration(minutes) {
  if (minutes == null) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/** Just the clock time — what a chat bubble needs. */
export function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatRelative(value) {
  if (!value) return '';

  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

// "Andheri Station, Mumbai, Maharashtra, India" -> "Andheri Station, Mumbai"
export function shortAddress(address, parts = 2) {
  if (!address) return '';
  return address.split(',').slice(0, parts).join(',').trim();
}

export const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

/** `3 trips`, `1 trip` — enough for the counts this app shows. */
export const plural = (count, word, suffix = 's') => `${count} ${word}${count === 1 ? '' : suffix}`;
