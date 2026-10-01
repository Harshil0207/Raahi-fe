import { ScrollText } from 'lucide-react';
import { EmptyState } from '@/admin/components/ui/misc';
import { formatDateTime, humanise } from '@/admin/utils/format';

/**
 * Audit entries, as a compact list.
 *
 * Shows what the value was and what it became, because that is the whole reason
 * the log exists — an entry saying "admin changed the fare" without the numbers
 * answers nothing.
 */
export function AuditTrail({ entries, showResource = false }) {
  if (!entries?.length) {
    return <EmptyState icon={ScrollText} title="Nothing recorded" />;
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {entries.map((entry) => (
        <li key={entry._id} className="px-4 py-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[13px] text-body">
              <span className="font-medium">{humanise(entry.action.replace(/\./g, ' '))}</span>
              {showResource && entry.resource && (
                <span className="ml-1.5 text-muted">
                  on {entry.resource}
                  {entry.resourceId ? ` ${shortish(entry.resourceId)}` : ''}
                </span>
              )}
            </p>
            <p className="text-[11.5px] text-muted">
              {entry.adminEmail} · {formatDateTime(entry.createdAt)}
            </p>
          </div>

          <ValueChange oldValue={entry.oldValue} newValue={entry.newValue} />

          {entry.note && <p className="mt-1 text-[12px] italic text-muted">“{entry.note}”</p>}
        </li>
      ))}
    </ul>
  );
}

/** A setting key stays whole; a 24-character id does not need to. */
const shortish = (value) => (/^[0-9a-f]{24}$/i.test(value) ? `…${value.slice(-8)}` : value);

function ValueChange({ oldValue, newValue }) {
  if (!oldValue && !newValue) return null;

  // Entries are per-field, so the interesting case is the shared keys.
  const keys = [...new Set([...Object.keys(oldValue || {}), ...Object.keys(newValue || {})])];
  if (!keys.length) return null;

  return (
    <ul className="mt-1 space-y-0.5">
      {keys.map((key) => {
        const before = oldValue?.[key];
        const after = newValue?.[key];
        if (JSON.stringify(before) === JSON.stringify(after)) return null;

        return (
          <li key={key} className="text-[12px]">
            <span className="text-muted">{key}: </span>
            {before !== undefined && (
              <>
                <span className="mono text-faint line-through">{render(before)}</span>
                <span className="mx-1.5 text-faint">→</span>
              </>
            )}
            <span className="mono text-body">{render(after)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function render(value) {
  if (value === null || value === undefined) return 'none';
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'empty';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
