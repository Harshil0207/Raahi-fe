import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp, Satellite } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/misc';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { formatMoney, formatRelative } from '@/utils/format';
import { cn } from '@/lib/utils';

/**
 * The rider's state, as a card that slides between two heights over the map.
 *
 * It used to be a fixed block, and it resized in a single frame: going online
 * added the location row and the card jumped 136px to 166px with nothing in
 * between, which read as a glitch rather than as a change. Every height change
 * now runs through one spring — the rider opening it, the rider closing it, and
 * the content changing underneath them.
 *
 * Collapsed it is a strip: am I on, and what have I made. Expanded it adds the
 * breakdown and the location state. It opens by drag, by tap, or by arrow key,
 * and it grows upward into the map rather than downward, because the GO button
 * below it must not move — a control that shifts under a thumb is worse than a
 * card that will not open.
 *
 * Everything it shows comes from the server (the earnings aggregate and the
 * rider profile's `onlineSince`), so it can never disagree with the Earnings
 * screen or with the switch below it.
 *
 * Opaque rather than glass on purpose: the map underneath moves, and moving
 * texture behind small text is the fastest way to make it unreadable.
 */

// Past this much travel, or this much flick, the release counts as a decision
// rather than a wobble.
const DRAG_DISTANCE = 36;
const DRAG_VELOCITY = 320;

export function StatusSheet({
  isOnline,
  onlineFor,
  earnings,
  wallet,
  hasLocation,
  lastSentAt,
  defaultExpanded = true,
  className
}) {
  const reduced = usePrefersReducedMotion();
  const detailId = useId();

  const [expanded, setExpanded] = useState(defaultExpanded);
  const { ref: detailRef, height: detailHeight } = useMeasuredHeight();

  // A drag that moved is not a tap, so the click it also fires is ignored.
  const draggedRef = useRef(false);

  const spring = reduced
    ? { duration: 0 }
    : { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };

  const settle = useCallback((_event, info) => {
    const { offset, velocity } = info;
    if (offset.y < -DRAG_DISTANCE || velocity.y < -DRAG_VELOCITY) setExpanded(true);
    else if (offset.y > DRAG_DISTANCE || velocity.y > DRAG_VELOCITY) setExpanded(false);

    // Cleared after the click that follows this release has been swallowed.
    requestAnimationFrame(() => {
      draggedRef.current = false;
    });
  }, []);

  const summary = earnings ? formatMoney(earnings.today.total, earnings.currency) : null;
  const blocked = Boolean(wallet && !wallet.canGoOnline);
  const owes = wallet?.outstanding > 0;

  return (
    <motion.section
      aria-label="Driving status"
      drag="y"
      // The card never travels: it rubber-bands under the finger and returns,
      // and the release decides which of the two heights it lands at. Animating
      // the real height during the drag instead would mean re-laying out the
      // map behind it on every frame.
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.24, bottom: 0.16 }}
      dragMomentum={false}
      onDragStart={() => {
        draggedRef.current = true;
      }}
      onDragEnd={settle}
      className={cn(
        'touch-pan-x select-none rounded-[var(--radius-sheet)] border border-hair bg-elevated',
        'shadow-[var(--shadow-sheet)]',
        className
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailId}
        onClick={() => {
          if (draggedRef.current) return;
          setExpanded((open) => !open);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setExpanded(true);
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setExpanded(false);
          }
        }}
        className={cn(
          'w-full cursor-grab rounded-[var(--radius-sheet)] px-4 pt-2.5 pb-3 text-left active:cursor-grabbing',
          'focus-visible:outline-2 focus-visible:outline-offset-2'
        )}
      >
        <span className="mx-auto mb-2.5 block h-1 w-10 rounded-full bg-[var(--border)]" aria-hidden />

        <span className="flex items-center gap-3">
          <span
            className={cn(
              'size-2.5 shrink-0 rounded-full',
              blocked
                ? 'bg-[var(--danger)]'
                : isOnline
                  ? 'bg-[var(--rider-status)]'
                  : 'bg-[var(--text-faint)]'
            )}
            aria-hidden
          />

          <span className="min-w-0 flex-1" aria-live="polite">
            <span className="block text-[15px] font-semibold leading-tight text-body">
              {isOnline ? "You're online" : "You're offline"}
            </span>
            <span className="block truncate text-[12.5px] leading-tight text-muted">
              {/* Collapsed, this line is all the rider gets, so the thing
                  stopping them working outranks the pleasantry about looking
                  for rides — and an unpaid balance outranks a missing
                  location, because it is the harder of the two to fix. */}
              {blocked
                ? 'Recharge your balance to go online'
                : !hasLocation
                  ? 'Location needed to receive requests'
                  : isOnline
                    ? 'Looking for rides…'
                    : 'Go online to receive ride requests'}
            </span>
          </span>

          {/* Today's money stands in for the whole panel while it is shut. */}
          <AnimatePresence initial={false}>
            {!expanded && summary && (
              <motion.span
                key="summary"
                initial={reduced ? false : { opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: 6 }}
                transition={{ duration: reduced ? 0 : 0.16 }}
                className="tabular shrink-0 text-[15px] font-semibold leading-tight text-body"
              >
                {summary}
              </motion.span>
            )}
          </AnimatePresence>

          <ChevronUp
            className={cn(
              'size-4 shrink-0 text-faint transition-transform duration-200 ease-[var(--ease-out-soft)]',
              expanded && 'rotate-180'
            )}
            aria-hidden
          />
        </span>
      </button>

      <motion.div
        id={detailId}
        // `initial={false}` so the first paint lands at the right height
        // instead of springing open in front of the rider.
        initial={false}
        animate={{ height: expanded ? detailHeight : 0, opacity: expanded ? 1 : 0 }}
        transition={spring}
        // `inert` rather than `aria-hidden` alone: the location block holds a
        // real button, and hiding it from the accessibility tree while it stays
        // tabbable strands a keyboard user on a control they cannot see.
        inert={!expanded}
        className="overflow-hidden"
      >
        <div ref={detailRef} className="px-4 pb-4">
          <dl className="grid grid-cols-3 gap-2 border-t border-hair pt-3.5">
            <Figure
              label="Earned today"
              value={
                earnings ? (
                  <AnimatedNumber
                    value={earnings.today.total}
                    format={(v) => formatMoney(v, earnings.currency)}
                  />
                ) : (
                  '—'
                )
              }
            />
            <Figure label="Trips today" value={earnings ? earnings.today.trips : '—'} />
            <Figure label="Online" value={onlineFor} />
          </dl>

          {owes && (
            <div
              className={cn(
                'mt-3.5 flex items-center justify-between gap-3 rounded-2xl p-3',
                blocked ? 'bg-[var(--danger-wash)]' : 'bg-sunken'
              )}
            >
              <span className="min-w-0 text-[12.5px] text-muted">
                {blocked ? 'Owed to the platform — recharge to drive' : 'Owed to the platform'}
              </span>
              <span className="tabular shrink-0 text-[14px] font-semibold text-body">
                {formatMoney(wallet.outstanding, wallet.currency)}
              </span>
            </div>
          )}

          {/**
           * The location block used to live here, and that was the bug.
           *
           * This half of the card is collapsed by default and `inert` while
           * collapsed, so the one control a blocked rider needed was both
           * invisible and unreachable — and it was rendered only when the
           * permission had NOT been denied, which removed it from exactly the
           * rider who needed it. `LocationPrompt` now owns that job and sits
           * beside the GO button, always visible. Nothing about it belongs in
           * here as well: the summary line above already names the state.
           */}
          {hasLocation && isOnline && (
            <p className="mt-3 flex items-center gap-2 text-[11.5px] text-faint">
              <Satellite className="size-3.5 shrink-0 text-[var(--success)]" aria-hidden />
              <span className="truncate">
                Sharing your location{lastSentAt ? ` · sent ${formatRelative(lastSentAt)}` : ''}
              </span>
            </p>
          )}
        </div>
      </motion.div>
    </motion.section>
  );
}

/**
 * The natural height of a block that is being clipped to zero.
 *
 * Measured rather than animated to `auto`, because the content changes on its
 * own — the location row arrives, the satellite line replaces it — and a target
 * of `auto` does not re-measure when that happens. A ResizeObserver does, so
 * those changes spring open at the same rate as a deliberate tap.
 */
function useMeasuredHeight() {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) setHeight(el.offsetHeight);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      // `borderBoxSize` includes the padding this block carries; contentRect
      // does not, and clipping to the content height cut the bottom padding off.
      const next = entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight;
      setHeight(next);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, height };
}

function Figure({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] leading-tight text-muted">{label}</dt>
      <dd className="tabular mt-1 truncate text-[17px] font-semibold leading-tight text-body">{value}</dd>
    </div>
  );
}
