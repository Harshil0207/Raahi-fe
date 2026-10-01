import { ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

/**
 * The pieces a settings screen is made of.
 *
 * They live together in one file because they are one thing: a row, in its
 * several forms. Splitting them across five files would mean five places to
 * keep a 44px touch target and a focus ring consistent, which is precisely the
 * consistency a settings screen is judged on.
 *
 * Every row is at least 44px tall and every control is labelled. The label is
 * the hit target for a switch, so the whole row responds rather than just the
 * switch itself — on a phone, aiming at a 32px switch with a thumb is the
 * difference between a settings screen that feels native and one that does not.
 */

/** A titled group of rows. */
export function SettingsSection({ title, description, children, className }) {
  return (
    <section className={cn('space-y-2', className)}>
      {title && (
        <div className="px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
      )}
      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl bg-surface">{children}</div>
    </section>
  );
}

/** The row body. Not exported — every row below is built from it. */
function Row({ icon: Icon, title, description, control, htmlFor, as = 'div', ...props }) {
  const Tag = as;

  return (
    <Tag
      {...props}
      htmlFor={htmlFor}
      className={cn(
        'flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-3 text-left transition-colors',
        (as === 'button' || as === 'label') && 'cursor-pointer hover:bg-[var(--surface-sunken)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset'
      )}
    >
      {Icon && (
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sunken text-muted" aria-hidden>
          <Icon className="size-[18px]" />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-body">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{description}</span>}
      </span>

      {control}
    </Tag>
  );
}

/**
 * A row that toggles something.
 *
 * Rendered as a `<label>` wrapping the switch, so tapping anywhere on the row
 * works and a screen reader announces the title as the switch's name — rather
 * than the switch carrying its own aria-label and the visible text being
 * decorative, which is how these usually end up.
 */
export function SettingsToggle({ icon, title, description, checked, onChange, disabled, busy }) {
  return (
    <Row
      as="label"
      icon={icon}
      title={title}
      description={description}
      control={
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled || busy}
          // Only this control is disabled while it saves, never the page.
          className={cn('shrink-0', busy && 'opacity-60')}
        />
      }
    />
  );
}

/**
 * A row that picks one of a few choices.
 *
 * A segmented control rather than a dropdown: with three or four options it is
 * one tap instead of two, it shows what the alternatives are without opening
 * anything, and it does not hand the phone's native picker a set of values our
 * own styling then disagrees with. Above four choices it wraps rather than
 * scrolls, which is ugly. Above four choices, use a `SettingsLink` that opens a
 * sheet instead.
 */
export function SettingsSegmented({ icon: Icon, title, description, value, options, onChange, disabled, busy }) {
  const name = `seg-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sunken text-muted" aria-hidden>
            <Icon className="size-[18px]" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] text-body" id={name}>
            {title}
          </p>
          {description && <p className="mt-0.5 text-[13px] leading-snug text-muted">{description}</p>}
        </div>
      </div>

      <div
        role="radiogroup"
        aria-labelledby={name}
        className={cn('mt-3 flex gap-1 rounded-2xl bg-sunken p-1', busy && 'opacity-60')}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled || busy}
              onClick={() => !selected && onChange(option.value)}
              className={cn(
                'min-h-11 flex-1 rounded-xl px-3 text-[14px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                selected
                  ? 'border border-hair bg-[var(--surface-elevated)] font-medium text-body shadow-[var(--shadow-raise)]'
                  : 'border border-transparent text-muted hover:text-body'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A row that opens something else — another screen, or a sheet. */
export function SettingsLink({ icon, title, description, value, onClick, href }) {
  const control = (
    <span className="flex shrink-0 items-center gap-1.5 text-muted">
      {value && <span className="text-[14px]">{value}</span>}
      <ChevronRight className="size-[18px]" aria-hidden />
    </span>
  );

  if (href) {
    return <Row as="a" href={href} icon={icon} title={title} description={description} control={control} />;
  }

  return <Row as="button" type="button" onClick={onClick} icon={icon} title={title} description={description} control={control} />;
}

/** A row that states something without offering to change it. */
export function SettingsStatic({ icon, title, description, value }) {
  return (
    <Row
      icon={icon}
      title={title}
      description={description}
      control={value ? <span className="shrink-0 text-[14px] text-muted">{value}</span> : null}
    />
  );
}

/**
 * A note the screen owes the reader — why something is missing, or fixed.
 *
 * Deliberately plain rather than a warning colour: most of these explain a
 * reasonable rule ("security alerts always reach you"), and dressing that up as
 * an alert makes a settings screen feel like it is scolding.
 */
export function SettingsNote({ children }) {
  return <p className="px-1 text-[13px] leading-relaxed text-muted">{children}</p>;
}
