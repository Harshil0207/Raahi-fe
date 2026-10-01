import { Suspense, lazy } from 'react';
import { LocateFixed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/misc';

// Leaflet is only pulled in on routes that actually render a map.
const MapView = lazy(() => import('./MapView').then((m) => ({ default: m.MapView })));

export function MapShell({ className, ...props }) {
  return (
    <div className={cn('relative isolate overflow-hidden', className)}>
      <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
        <MapView {...props} />
      </Suspense>
    </div>
  );
}

/** Floating control that sits above the map without covering it. */
export function MapButton({ icon: Icon = LocateFixed, label, onClick, className, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-11 place-items-center rounded-full border border-hair bg-elevated text-body shadow-[var(--shadow-float)]',
        'transition-transform active:scale-95 disabled:opacity-50',
        className
      )}
    >
      <Icon className="size-[18px]" aria-hidden />
    </button>
  );
}
