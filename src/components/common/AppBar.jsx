import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppBar({ title, subtitle, back, right, className, floating = false }) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        'flex items-center gap-3 px-4 pt-safe pb-3',
        // Page content is capped and centred from `md`; the bar follows the same
        // column so the title sits over its content instead of off in the margin.
        !floating && 'md:mx-auto md:w-full md:max-w-2xl',
        floating ? 'pointer-events-none absolute inset-x-0 top-0 z-20' : 'surface',
        className
      )}
    >
      {back && (
        <button
          type="button"
          onClick={() => {
            // A function means the page handles it itself — a settings section
            // closing back to its list, say, where history would leave the
            // screen altogether. A string is a destination; `true` is history.
            if (typeof back === 'function') return back();
            return typeof back === 'string' ? navigate(back) : navigate(-1);
          }}
          aria-label="Go back"
          className={cn(
            'pointer-events-auto grid size-10 shrink-0 place-items-center rounded-full text-body transition-colors',
            floating ? 'bg-elevated shadow-[var(--shadow-float)]' : 'hover:bg-[var(--surface-sunken)]'
          )}
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      <div className={cn('min-w-0 flex-1', floating && 'pointer-events-none')}>
        {title && <h1 className="truncate text-base font-semibold text-body">{title}</h1>}
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>

      {right && <div className="pointer-events-auto flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}
