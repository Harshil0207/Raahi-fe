import { useMemo } from 'react';

/** The "or continue with" rule between the form and the provider buttons. */
export function AuthDivider({ label = 'or continue with' }) {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-[var(--border)]" />
      <span className="text-[12px] uppercase tracking-wide text-faint">{label}</span>
      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

/**
 * The five rules a Raahi password has to satisfy, mirrored from the backend.
 *
 * Shown as a checklist rather than a single "weak/strong" word, because a bar
 * that says "weak" tells somebody they have failed without telling them what to
 * change. The server enforces exactly these; this is the same list, said early.
 */
const RULES = [
  { id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'lower', label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'upper', label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'number', label: 'A number', test: (v) => /[0-9]/.test(v) },
  { id: 'symbol', label: 'A symbol', test: (v) => /[^A-Za-z0-9]/.test(v) }
];

export function passwordRulesMet(value = '') {
  return RULES.every((rule) => rule.test(value));
}

export function PasswordStrength({ value = '', className = '' }) {
  const results = useMemo(() => RULES.map((rule) => ({ ...rule, ok: rule.test(value) })), [value]);
  const met = results.filter((r) => r.ok).length;

  // Nothing typed yet: the checklist would be five red crosses before anybody
  // has had a chance, which reads as failure rather than guidance.
  if (!value) return null;

  return (
    <div className={className}>
      <div className="flex gap-1" aria-hidden>
        {RULES.map((rule, index) => (
          <span
            key={rule.id}
            className={`h-1 flex-1 rounded-full transition-colors ${
              index < met ? toneFor(met) : 'bg-[var(--border)]'
            }`}
          />
        ))}
      </div>

      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1" aria-live="polite">
        {results.map((rule) => (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 text-[12px] ${rule.ok ? 'text-[var(--success)]' : 'text-muted'}`}
          >
            <span aria-hidden className="w-3 text-center">
              {rule.ok ? '✓' : '·'}
            </span>
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Status colours only; no third hue is introduced for this. */
function toneFor(met) {
  if (met >= 5) return 'bg-[var(--success)]';
  if (met >= 3) return 'bg-[var(--warning)]';
  return 'bg-[var(--danger)]';
}
