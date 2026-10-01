import { useId } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants/icons';
import { Spinner } from '@/components/ui/misc';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

const Power = ICONS.online;

/**
 * The one control on the driving screen: a thumb-sized disc that puts the rider
 * on or off the road.
 *
 * It is a real `<button>` carrying `role="switch"`, not a styled div and not a
 * track-and-thumb switch. The state is binary and announced through
 * `aria-checked`, while the accessible name says what the next tap does — a
 * rider reaching for this with VoiceOver on needs "Go offline", not "Online".
 *
 * THE FACE says the state: GO when off the road, ONLINE when on it. The caption
 * underneath says the action, because a disc reading ONLINE on its own gives a
 * rider finishing a shift nothing to aim at — they read it as a status badge
 * and go looking for a settings screen.
 *
 * THE MOTION is a press, not a performance. Scale 1 → 0.96 → 1 on touch, which
 * is the whole of the feedback a finger needs; the state change cross-fades
 * rather than bouncing. Online, a single slow ring breathes out about every two
 * and a half seconds — a beacon, not an alarm. Everything animated here is
 * transform or opacity, so none of it touches layout, and all of it is off
 * under `prefers-reduced-motion` except the state itself.
 */
export function GoButton({
  isOnline,
  busy = false,
  disabled = false,
  hint,
  action,
  onToggle,
  className
}) {
  const reduced = usePrefersReducedMotion();
  const hintId = useId();

  const blocked = disabled || busy;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <span className="relative grid place-items-center">
        {/**
         * The beacon.
         *
         * One ring rather than a stack of them, and slow enough to read as
         * breathing. It is `pointer-events-none` and absolutely positioned, so
         * it can never intercept the tap or move anything around it.
         */}
        {isOnline && !reduced && !busy && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute size-[5.5rem] rounded-full bg-[color-mix(in_oklab,var(--rider-status)_45%,transparent)]"
            animate={{ scale: [0.94, 1.28], opacity: [0.42, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        <motion.button
          type="button"
          role="switch"
          aria-checked={isOnline}
          aria-label={isOnline ? 'Go offline' : 'Go online'}
          aria-busy={busy || undefined}
          aria-describedby={hint ? hintId : undefined}
          disabled={blocked}
          onClick={() => onToggle(!isOnline)}
          // The press. `whileTap` responds to the touch itself rather than to a
          // state change, so it happens on contact instead of after a round
          // trip — which is the difference between a button that feels
          // connected and one that feels laggy.
          whileTap={blocked || reduced ? undefined : { scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 520, damping: 30, mass: 0.5 }}
          className={cn(
            // 5.5rem = 88px: comfortably past the 44px minimum, and past the
            // 72px this screen asks for.
            'relative grid size-[5.5rem] shrink-0 cursor-pointer place-items-center rounded-full',
            'text-[var(--accent-contrast)] shadow-[var(--shadow-float)]',
            // Colour is the only thing that transitions in CSS; the scale is
            // framer's, so the two cannot fight over the same property.
            'transition-colors duration-300 ease-[var(--ease-out-soft)]',
            'focus-visible:outline-2 focus-visible:outline-offset-4',
            'disabled:cursor-not-allowed disabled:opacity-45',
            // Green means available, which is the one place this app spends a
            // hue; offline it is ink, the strongest thing on the screen.
            isOnline ? 'bg-[var(--rider-status)]' : 'bg-[var(--accent)]'
          )}
        >
          {busy ? (
            <Spinner className="size-6" />
          ) : (
            // Keyed on the state so the two faces cross-fade rather than one
            // being swapped for the other mid-frame.
            <motion.span
              key={isOnline ? 'online' : 'offline'}
              initial={reduced ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-0.5 leading-none"
            >
              {isOnline ? (
                <>
                  <Power className="size-[18px]" aria-hidden />
                  <span className="mt-0.5 text-[11px] font-semibold leading-none tracking-[0.12em]">
                    ONLINE
                  </span>
                </>
              ) : (
                <span className="text-[26px] font-semibold tracking-[0.12em]">GO</span>
              )}
            </motion.span>
          )}
        </motion.button>
      </span>

      {/**
       * What the next tap does, and why it cannot be done.
       *
       * The action caption is always there while online — a disc reading ONLINE
       * is a state, and the rider needs to know it is also the way out. A block
       * reason replaces it, because a rider who cannot go online has a more
       * pressing thing to read.
       *
       * And when the block has a fix, `action` carries it. A disabled disc with
       * "You owe ₹160" under it is a dead end otherwise: the rider is told what
       * is wrong and given nowhere to go. This is the way out, so it renders
       * with the reason rather than somewhere else on the screen.
       */}
      {hint ? (
        <p id={hintId} className="max-w-[14rem] text-center text-[11.5px] leading-tight text-muted">
          {hint}
        </p>
      ) : (
        <p className="text-center text-[11.5px] leading-tight text-faint">
          {isOnline ? 'Tap to go offline' : 'Tap to start receiving requests'}
        </p>
      )}

      {action}
    </div>
  );
}
