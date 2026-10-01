import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The title block every screen starts with. */
export function PageHeader({ title, description, back, actions, children, className }) {
  return (
    <header className={cn('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-2">
        {back && (
          <Link
            to={back}
            aria-label="Back"
            className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[var(--radius-field)] text-muted transition-colors hover:bg-[var(--surface-hover)] hover:text-body"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-semibold tracking-tight text-body">{title}</h1>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          {children}
        </div>
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
