import { useState } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { Input, Select, Textarea } from '@/admin/components/ui/input';
import { Switch } from '@/admin/components/ui/misc';
import { Button } from '@/admin/components/ui/button';
import { formatDateTime } from '@/admin/utils/format';
import { cn } from '@/lib/utils';

/**
 * One configurable value.
 *
 * Everything the brief asks for is here and comes from the server, not from a
 * copy in the console: the current value, the description, the allowed range,
 * and when it last changed. A setting added in a backend deploy renders
 * correctly without touching this file.
 *
 * `dirty` is decided by the parent form, which owns the draft — a per-field save
 * button would mean six requests to change six related values, and the backend
 * validates a group as a whole.
 */
export function SettingField({ setting, value, onChange, error, disabled }) {
  const dirty = JSON.stringify(value) !== JSON.stringify(setting.value);

  return (
    <div className={cn('px-4 py-3.5', dirty && 'bg-[var(--accent-wash)]')}>
      <div className="gap-4 lg:grid lg:grid-cols-[1fr_16rem]">
        <div className="min-w-0">
          <label className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium text-body">
            {setting.label}
            {setting.highImpact && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-wash)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--warning)]">
                <AlertTriangle className="size-2.5" aria-hidden />
                Confirms on save
              </span>
            )}
          </label>

          <p className="mt-0.5 max-w-prose text-[12.5px] text-muted">{setting.description}</p>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-faint">
            <span className="mono">{setting.key}</span>
            {setting.type === 'number' && setting.min !== undefined && (
              <span>
                allowed {setting.min}–{setting.max}
              </span>
            )}
            {setting.isDefault ? (
              <span>at its default</span>
            ) : (
              setting.updatedAt && <span>changed {formatDateTime(setting.updatedAt)}</span>
            )}
          </p>
        </div>

        <div className="mt-2 lg:mt-0">
          <Control setting={setting} value={value} onChange={onChange} error={error} disabled={disabled} />

          {error && (
            <p role="alert" className="mt-1 text-[12px] text-[var(--danger)]">
              {error}
            </p>
          )}

          {dirty && (
            <button
              type="button"
              onClick={() => onChange(setting.value)}
              className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-muted transition-colors hover:text-body"
            >
              <RotateCcw className="size-3" aria-hidden />
              Undo — was {renderValue(setting.value)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const renderValue = (value) => {
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (Array.isArray(value)) return `${value.length} entries`;
  if (value === '') return 'empty';
  return String(value);
};

function Control({ setting, value, onChange, error, disabled }) {
  if (setting.type === 'boolean') {
    return (
      <div className="flex items-center gap-2.5">
        <Switch checked={Boolean(value)} onCheckedChange={onChange} disabled={disabled} aria-label={setting.label} />
        <span className="text-[13px] text-muted">{value ? 'On' : 'Off'}</span>
      </div>
    );
  }

  if (setting.type === 'number') {
    return (
      <Input
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        min={setting.min}
        max={setting.max}
        step="any"
        disabled={disabled}
        invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
        aria-label={setting.label}
      />
    );
  }

  if (setting.type === 'string[]') {
    return <ListControl value={value || []} onChange={onChange} disabled={disabled} label={setting.label} />;
  }

  // A long string gets room to breathe; a short one does not need it.
  if (setting.maxLength && setting.maxLength > 120) {
    return (
      <Textarea
        value={value ?? ''}
        rows={3}
        maxLength={setting.maxLength}
        disabled={disabled}
        invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        aria-label={setting.label}
      />
    );
  }

  return (
    <Input
      value={value ?? ''}
      maxLength={setting.maxLength}
      disabled={disabled}
      invalid={Boolean(error)}
      onChange={(event) => onChange(event.target.value)}
      aria-label={setting.label}
    />
  );
}

/**
 * A list of tags, for the configurable complaint categories.
 *
 * Uppercased on entry because that is the form the backend stores and validates
 * against — leaving the operator to remember that would produce a category
 * nobody can file under.
 */
function ListControl({ value, onChange, disabled, label }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const entry = draft.trim().toUpperCase().replace(/\s+/g, '_');
    if (!entry || value.includes(entry)) {
      setDraft('');
      return;
    }
    onChange([...value, entry]);
    setDraft('');
  };

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-1.5">
        {value.map((entry) => (
          <li key={entry}>
            <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-2 py-0.5 text-[11.5px] text-body">
              <span className="mono">{entry}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((item) => item !== entry))}
                  aria-label={`Remove ${entry}`}
                  className="text-faint transition-colors hover:text-[var(--danger)]"
                >
                  <X className="size-3" aria-hidden />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      {!disabled && (
        <div className="flex gap-1.5">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add();
              }
            }}
            placeholder="Add an entry"
            aria-label={`Add to ${label}`}
          />
          <Button size="md" onClick={add} disabled={!draft.trim()}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
