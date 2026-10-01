import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { ServiceIcon } from '@/components/common/ServiceIcon';
import { Skeleton } from '@/components/ui/misc';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { formatMoney } from '@/utils/format';
import { cn } from '@/lib/utils';

/**
 * Choosing what turns up.
 *
 * Passenger services are a row of cards; Parcel is one card that opens into the
 * two delivery vehicles. That shape is deliberate — sending a package is a
 * different job from taking a trip, and a flat list of six equal cards invites
 * someone in a hurry to book a bike for a laptop. One tap of separation is
 * enough to stop that without adding a whole screen.
 *
 * Every price here comes from the server, quoted for this exact distance. The
 * component multiplies nothing: if the fare shown and the fare charged could
 * ever disagree, the customer is right and the app is wrong.
 */
export function ServicePicker({ services, value, onChange, loading, currency = 'INR', className }) {
  const reduced = usePrefersReducedMotion();

  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.25rem] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!services?.length) {
    return (
      <p className={cn('rounded-2xl bg-sunken px-4 py-5 text-center text-[13.5px] text-muted', className)}>
        No services are available right now.
      </p>
    );
  }

  const passenger = services.filter((s) => s.bookingType === 'RIDE');
  const parcels = services.filter((s) => s.bookingType === 'PARCEL');

  const parcelSelected = parcels.some((s) => s.serviceType === value);

  return (
    <div className={cn('space-y-2', className)} role="radiogroup" aria-label="Choose a service">
      {passenger.map((service) => (
        <ServiceRow
          key={service.serviceType}
          service={service}
          currency={currency}
          selected={value === service.serviceType}
          onSelect={() => onChange(service.serviceType)}
        />
      ))}

      {parcels.length > 0 && (
        <div
          className={cn(
            'overflow-hidden rounded-2xl border transition-colors',
            parcelSelected ? 'border-[var(--accent)]' : 'border-hair'
          )}
        >
          <ParcelHeader
            open={parcelSelected}
            // Opening the group picks the first delivery vehicle, so the group
            // is never open with nothing chosen inside it.
            onToggle={() => onChange(parcelSelected ? null : parcels[0].serviceType)}
          />

          <AnimatePresence initial={false}>
            {parcelSelected && (
              <motion.div
                key="parcels"
                initial={reduced ? false : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="px-3.5 pb-1 pt-0.5 text-[11.5px] font-medium uppercase tracking-wide text-faint">
                  Choose delivery vehicle
                </p>

                <div className="space-y-1.5 p-2 pt-1">
                  {parcels.map((service) => (
                    <ServiceRow
                      key={service.serviceType}
                      service={service}
                      currency={currency}
                      selected={value === service.serviceType}
                      onSelect={() => onChange(service.serviceType)}
                      nested
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ParcelHeader({ open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[var(--surface-sunken)]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-body">
        <ServiceIcon serviceType="BIKE_PARCEL" className="size-[18px]" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-body">Parcel</span>
        <span className="block text-[12.5px] text-muted">Send a package, no passenger</span>
      </span>

      <ChevronDown
        className={cn('size-4 shrink-0 text-faint transition-transform', open && 'rotate-180')}
        aria-hidden
      />
    </button>
  );
}

function ServiceRow({ service, currency, selected, onSelect, nested }) {
  const free = service.free || service.estimatedFare === 0;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors',
        nested ? 'bg-sunken' : 'border',
        !nested && (selected ? 'border-[var(--accent)] bg-[var(--accent-wash)]' : 'border-hair hover:bg-[var(--surface-sunken)]'),
        nested && selected && 'bg-[var(--accent-wash)]'
      )}
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-xl',
          selected ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'bg-sunken text-body'
        )}
      >
        <ServiceIcon serviceType={service.serviceType} className="size-[18px]" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold text-body">{service.label}</span>
          {selected && <Check className="size-3.5 shrink-0 text-accent" aria-hidden />}
        </span>
        <span className="block truncate text-[12.5px] text-muted">{service.description}</span>
      </span>

      <span className="shrink-0 text-right">
        {free ? (
          // Zero is a decision, so it is named rather than shown as "₹0".
          <span className="text-[14px] font-semibold text-[var(--success)]">Free</span>
        ) : (
          <>
            <span className="tabular block text-[15px] font-semibold text-body">
              {formatMoney(service.estimatedFare, currency)}
            </span>
            <span className="tabular block text-[11px] text-faint">
              {formatMoney(service.ratePerKm, currency)}/km
            </span>
          </>
        )}
      </span>
    </button>
  );
}
