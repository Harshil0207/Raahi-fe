import { Clock, History, MapPin } from 'lucide-react';
import { shortAddress } from '@/utils/format';
import { cn } from '@/lib/utils';

/**
 * The list of places picked before, shown where a search sheet would otherwise
 * be empty.
 *
 * Deliberately compact: this sits above the keyboard on a phone, so a row is
 * two lines and the list is short. A long scroll of history here pushes the
 * search field off the screen, which is the opposite of helpful.
 *
 * Used by both the destination and the pickup picker; the only difference is
 * the wording, which the caller supplies.
 */
export function RecentPlaces({
  places,
  onSelect,
  disabled = false,
  title = 'Recent destinations',
  emptyTitle = 'No recent destinations',
  emptyHint,
  className
}) {
  if (!places.length) {
    return (
      <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
        <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-sunken text-faint">
          <History className="size-5" aria-hidden />
        </div>
        <p className="text-[15px] font-medium text-body">{emptyTitle}</p>
        {emptyHint && <p className="mt-1 max-w-[16rem] text-[13px] text-muted">{emptyHint}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="px-4 pb-1 pt-3 text-[11.5px] font-semibold uppercase tracking-wide text-faint">{title}</h3>

      {/* A little room under the last row so it never sits flush against the
          edge of the sheet. */}
      <ul className="pb-2">
        {places.map((place) => (
          <li key={place.placeId || place.address}>
            <button
              type="button"
              onClick={() => onSelect(place)}
              disabled={disabled}
              className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-sunken)] disabled:opacity-60"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sunken text-muted">
                <Clock className="size-4" aria-hidden />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-body">
                  {shortAddress(place.address, 1)}
                </span>
                <span className="block truncate text-xs text-muted">{place.address}</span>
              </span>

              <MapPin className="size-4 shrink-0 text-faint" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
