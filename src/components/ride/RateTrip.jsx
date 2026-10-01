import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import * as rideApi from '@/services/ride.api';
import { cn } from '@/lib/utils';

const LABELS = ['', 'Poor', 'Not great', 'Fine', 'Good', 'Excellent'];

/**
 * What each side is asked about, beyond the overall score.
 *
 * Three each, because a list long enough to feel like a form is a list nobody
 * fills in — and they are optional on the server, so a one-tap rating is still
 * a complete rating. The keys are the server's; anything else is rejected by
 * the route's schema rather than silently stored.
 */
const CATEGORIES = {
  rider: [
    { key: 'driving', label: 'Driving' },
    { key: 'behaviour', label: 'Behaviour' },
    { key: 'vehicle', label: 'Vehicle' }
  ],
  customer: [
    { key: 'behaviour', label: 'Behaviour' },
    { key: 'readiness', label: 'Ready on time' },
    { key: 'communication', label: 'Communication' }
  ]
};

/**
 * Rating for a completed trip, in either direction.
 *
 * `side` is who is being rated, which decides both the categories and the route
 * it posts to. The backend accepts one rating per ride per side and feeds it
 * into that person's average, so once a value is set this shows what was
 * submitted rather than offering to submit it again — and the server rejects a
 * second attempt anyway, since a screen left open on two devices is not
 * something a disabled button can prevent.
 */
export function RateTrip({ rideId, side = 'rider', personName, rating, onRated }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [categories, setCategories] = useState({});
  const [saving, setSaving] = useState(false);

  const submitted = rating?.value ?? null;
  const fields = CATEGORIES[side] || CATEGORIES.rider;

  async function submit() {
    if (!value || saving) return;

    setSaving(true);
    try {
      const send = side === 'customer' ? rideApi.rateCustomer : rideApi.rateRide;
      await send(rideId, {
        rating: value,
        comment: comment.trim() || undefined,
        // Omitted entirely when nothing was tapped, rather than sent as an
        // empty object: "not answered" and "answered zero" are different, and
        // only one of them is true here.
        categories: Object.keys(categories).length ? categories : undefined
      });
      toast.success('Thanks for the rating');
      onRated?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-sunken p-4">
        <div>
          <p className="text-[14px] font-medium text-body">
            {side === 'customer' ? 'You rated this customer' : 'You rated this trip'}
          </p>
          {rating.comment && <p className="mt-0.5 text-[13px] text-muted">&ldquo;{rating.comment}&rdquo;</p>}
        </div>
        <Stars value={submitted} className="size-4" label={`${submitted} out of 5`} />
      </div>
    );
  }

  const shown = hover || value;
  const firstName = personName ? personName.split(' ')[0] : null;

  return (
    <div className="space-y-3 rounded-2xl bg-sunken p-4">
      <div>
        <p className="text-[15px] font-medium text-body">
          {side === 'customer'
            ? `How was ${firstName || 'your customer'}?`
            : `How was your trip${firstName ? ` with ${firstName}` : ''}?`}
        </p>
        <p className="text-[12.5px] text-muted">{shown ? LABELS[shown] : 'Tap a star to rate'}</p>
      </div>

      <div className="flex gap-1" role="radiogroup" aria-label="Trip rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            whileTap={{ scale: 0.88 }}
            onClick={() => setValue(n)}
            onPointerEnter={() => setHover(n)}
            onPointerLeave={() => setHover(0)}
            className="grid size-11 place-items-center rounded-xl transition-colors hover:bg-[var(--surface-elevated)]"
          >
            <Star
              className={cn(
                'size-6 transition-colors',
                n <= shown ? 'fill-current text-[var(--warning)]' : 'text-faint'
              )}
              aria-hidden
            />
          </motion.button>
        ))}
      </div>

      {value > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3 overflow-hidden"
        >
          <div className="space-y-1.5">
            {fields.map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-muted">{field.label}</span>
                <CategoryStars
                  label={field.label}
                  value={categories[field.key] || 0}
                  onChange={(n) => setCategories((prev) => ({ ...prev, [field.key]: n }))}
                />
              </div>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Add a note (optional)"
            className="w-full resize-none rounded-xl border border-hair bg-elevated px-3 py-2.5 text-[14px] text-body outline-none placeholder:text-faint focus-visible:border-[var(--accent)]"
          />
          <Button block loading={saving} onClick={submit}>
            Submit rating
          </Button>
        </motion.div>
      )}
    </div>
  );
}

function Stars({ value, className, label }) {
  return (
    <div className="flex shrink-0 gap-0.5" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(className, n <= value ? 'fill-current text-[var(--warning)]' : 'text-faint')}
          aria-hidden
        />
      ))}
    </div>
  );
}

/** Smaller stars for one category. Tappable area stays at 32px. */
function CategoryStars({ label, value, onChange }) {
  return (
    <div className="flex" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${label}: ${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="grid size-8 place-items-center rounded-lg transition-colors hover:bg-[var(--surface-elevated)]"
        >
          <Star
            className={cn('size-4', n <= value ? 'fill-current text-[var(--warning)]' : 'text-faint')}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}
