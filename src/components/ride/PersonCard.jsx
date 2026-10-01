import { Phone, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { initialsOf, plural } from '@/utils/format';

/**
 * The other party on the ride. For the customer this is the rider and their
 * vehicle; for the rider it is the customer. Both get a working call button —
 * the phone number comes from the backend only after the ride is assigned.
 */
export function PersonCard({ name, phone, subtitle, vehicle, rating, trips }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--accent)]/15 text-sm font-semibold text-[var(--accent)]">
        {initialsOf(name) || '—'}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-body">{name || 'Assigned'}</p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          {rating != null && (
            <span className="inline-flex items-center gap-1">
              <Star className="size-3 fill-current text-[var(--warning)]" aria-hidden />
              <span className="tabular">{rating}</span>
            </span>
          )}
          {trips != null && <span className="tabular">{plural(trips, 'trip')}</span>}
          {subtitle && <span className="truncate">{subtitle}</span>}
        </div>

        {vehicle && (
          <p className="mt-1 truncate text-sm text-body">
            <span className="font-medium tracking-wide">{vehicle.numberPlate}</span>
            <span className="text-muted">
              {' · '}
              {[vehicle.color, vehicle.make, vehicle.model].filter(Boolean).join(' ') || vehicle.type}
            </span>
          </p>
        )}
      </div>

      {phone && (
        <Button asChild size="icon" variant="outline" className="shrink-0">
          <a href={`tel:${phone}`} aria-label={`Call ${name || 'them'}`}>
            <Phone aria-hidden />
          </a>
        </Button>
      )}
    </div>
  );
}
