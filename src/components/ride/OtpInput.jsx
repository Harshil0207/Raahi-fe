import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountdown } from '@/hooks/useCountdown';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { OTP_LENGTH, OTP_LENGTH_RANGE } from '@/constants/ride';

const NON_DIGITS = /\D+/g;

const clampLength = (n) =>
  Math.min(Math.max(Math.trunc(Number(n)) || OTP_LENGTH, OTP_LENGTH_RANGE.min), OTP_LENGTH_RANGE.max);

/**
 * One field wearing `length` boxes.
 *
 * It is a single controlled input in every sense that matters: there is no
 * internal copy of the code, each box is a slice of the `value` prop, and every
 * edit goes back out through `onChange`. The separate `<input>` elements exist
 * so a screen reader can name each digit and so arrow keys have somewhere to
 * go — they never own state.
 *
 * `value` is kept digits-only and gap-free, so `value.length` is the number of
 * digits entered and the caller can compare it against the length it asked for.
 *
 * The length is a prop rather than a constant because the backend setting
 * `ride.otpLength` is an admin-configurable 4–6. The caller reads it from the
 * platform settings and passes it here; OTP_LENGTH is only the fallback for the
 * moment before those have arrived.
 *
 * A rejected code does not clear anything. `invalid`/`error` paint the boxes and
 * announce the problem while the digits stay put, because a wrong code is
 * almost always one wrong digit and retyping the rest is the worst part of
 * standing next to a car in the rain.
 */
export function OtpInput({
  value = '',
  onChange,
  onComplete,
  length = OTP_LENGTH,
  disabled = false,
  loading = false,
  verified = false,
  invalid = false,
  error = null,
  autoFocus = true,
  label = 'Pickup code',
  className
}) {
  const size = clampLength(length);
  const code = String(value).replace(NON_DIGITS, '').slice(0, size);

  const refs = useRef([]);
  const baseId = useId();
  const errorId = `${baseId}-error`;
  const statusId = `${baseId}-status`;
  const reduceMotion = usePrefersReducedMotion();

  // Locked covers every state where a keystroke would be meaningless: the
  // request is in flight, it succeeded, or the caller turned the field off.
  const locked = disabled || loading || verified;

  /**
   * The value as of the last edit, which is not always the value on screen.
   *
   * `onChange` only schedules the parent's state update, so the `code` prop is
   * still the pre-keystroke string for the rest of the current task — and
   * `.focus()` dispatches its event synchronously inside that same task. Every
   * decision below therefore reads this ref rather than the prop.
   *
   * This is what the flicker was. `handleFocus` compared the box being focused
   * against a caret computed from the stale prop, decided the caret had
   * overshot, and bounced focus back a box — a visible blur/focus flash on two
   * boxes per keystroke. It also silently corrupted the code: with focus left
   * one box behind, the next digit overwrote the previous one, so typing
   * 1-2-3-4 produced "24" and a four-digit code took seven presses.
   */
  const live = useRef(code);

  // Synchronously after each commit, so the ref is in step with what is on
  // screen before the browser can deliver another keystroke. A plain effect
  // would leave a window where a fast typist edits against a stale value, and
  // assigning during render is not allowed.
  useLayoutEffect(() => {
    live.current = code;
  }, [code]);

  // The caret belongs on the first box without a digit, or on the last box once
  // they are all full.
  const caretFor = (digits) => Math.min(digits.length, size - 1);

  const focusBox = (index) => refs.current[Math.min(Math.max(index, 0), size - 1)]?.focus();

  /**
   * Focus follows the field being usable.
   *
   * Keyed on `locked` rather than latched once: completing the code disables
   * the boxes, which drops focus to the document, and a rejected code unlocks
   * them again. The old one-shot latch meant focus was never returned, so
   * correcting a single wrong digit began with hunting for the box by hand.
   */
  useEffect(() => {
    if (!autoFocus || locked) return;
    focusBox(caretFor(live.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-focus when the field becomes usable, not on every keystroke
  }, [autoFocus, locked]);

  /**
   * The one place the value changes. Everything below decides what the next
   * string should be and hands it here; this normalises it, tells the caller,
   * moves the caret, and fires `onComplete` when the code has just become full.
   */
  const commit = (next, focusIndex) => {
    const clean = String(next).replace(NON_DIGITS, '').slice(0, size);
    const changed = clean !== live.current;

    // Recorded before focus moves, so the focus handler that `focusBox` is
    // about to trigger judges the new box against the new value.
    live.current = clean;

    if (changed) onChange?.(clean);
    if (focusIndex != null) focusBox(focusIndex);
    // `changed` guards against a second submit from the same digits, but an
    // in-place fix after a rejection still counts as a change and resubmits.
    if (changed && clean.length === size) onComplete?.(clean);
  };

  // The fallback for input that never produced a usable keydown: virtual
  // keyboards report `Unidentified`, and autofill produces no key event at all.
  const handleChange = (index, raw) => {
    const typed = raw.replace(NON_DIGITS, '');
    if (!typed) return;

    // Android's SMS autofill drops the whole code into whichever box has focus,
    // arriving as one change rather than a paste. Treat it like a paste.
    if (typed.length > 1) {
      commit(typed, typed.length);
      return;
    }

    // `live.current`, not `code`: a fast typist can land two keystrokes inside
    // one render, and the second must build on the first.
    const current = live.current;
    const at = Math.min(index, current.length);
    commit(current.slice(0, at) + typed + current.slice(at + 1), at + 1);
  };

  const handleKeyDown = (index, e) => {
    // Let the browser have the shortcuts; Cmd/Ctrl+V still reaches onPaste.
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const current = live.current;
    const at = Math.min(index, current.length);

    // Digits are taken here rather than left to onChange, because `maxLength=1`
    // silently swallows a keystroke aimed at a box that already holds a digit —
    // which is exactly the keystroke someone makes to fix a rejected code.
    // preventDefault stops the change event, so this never double-counts.
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      commit(current.slice(0, at) + e.key + current.slice(at + 1), at + 1);
      return;
    }

    switch (e.key) {
      case 'Backspace':
        e.preventDefault();
        // A digit under the caret goes; an empty box sends the caret back and
        // takes the digit before it, which is what one long field would do.
        if (current[at]) commit(current.slice(0, at) + current.slice(at + 1), at);
        else if (at > 0) commit(current.slice(0, at - 1) + current.slice(at), at - 1);
        break;
      case 'Delete':
        e.preventDefault();
        if (current[at]) commit(current.slice(0, at) + current.slice(at + 1), at);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        focusBox(at - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        focusBox(Math.min(at + 1, caretFor(current)));
        break;
      case 'Home':
        e.preventDefault();
        focusBox(0);
        break;
      case 'End':
        e.preventDefault();
        focusBox(caretFor(current));
        break;
      default:
        break;
    }
  };

  // Bound to every box, so a paste lands the same wherever the caret happens
  // to be: the code fills from the first digit.
  const handlePaste = (e) => {
    const pasted = (e.clipboardData?.getData('text') || '').replace(NON_DIGITS, '').slice(0, size);
    if (!pasted) return;
    e.preventDefault();
    commit(pasted, pasted.length);
  };

  // Clicking a box past the end would leave a hole in the code, so the caret
  // stops at the first empty one. Selecting lets a typed digit replace a wrong
  // one in place rather than being swallowed by `maxLength`.
  const handleFocus = (index, e) => {
    // Judged against the live value, so the box `commit` just moved to is not
    // mistaken for an overshoot and bounced back.
    const limit = caretFor(live.current);
    if (index > limit) {
      focusBox(limit);
      return;
    }
    e.target.select();
  };

  const tone = verified
    ? 'border-[var(--success)] bg-[var(--success-wash)] text-[var(--success)]'
    : invalid
      ? 'border-[var(--danger)] bg-[var(--danger-wash)] text-body focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--danger)_25%,transparent)]'
      : 'border-hair bg-elevated text-body focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_20%,transparent)]';

  return (
    <div className={className}>
      <div role="group" aria-label={label} className={cn('flex', size > 4 ? 'gap-1.5' : 'gap-2.5')}>
        {Array.from({ length: size }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            value={code[i] ?? ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => handleFocus(i, e)}
            disabled={locked}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={1}
            aria-label={`${label}, digit ${i + 1} of ${size}`}
            aria-invalid={invalid || undefined}
            aria-describedby={error ? `${errorId} ${statusId}` : statusId}
            className={cn(
              // 64px tall clears the 48px target with room for a thumb that is
              // aiming at one box out of six.
              'tabular h-16 min-w-0 flex-1 rounded-2xl border text-center font-semibold',
              'caret-transparent outline-none transition-[border-color,box-shadow,background-color] duration-150',
              'disabled:cursor-not-allowed',
              size > 4 ? 'text-xl' : 'text-2xl',
              disabled && !loading && !verified && 'opacity-50',
              tone
            )}
          />
        ))}
      </div>

      {/**
       * One message row, always the same height.
       *
       * The error node used to mount and unmount — cleared on every keystroke,
       * restored on every rejection — and the sheet around this component
       * animates its layout, so correcting a single digit sprang the whole card
       * by the height of a line of text. Reserving the row means a message can
       * appear and clear without anything above it moving.
       *
       * Both regions stay in the DOM: `role="alert"` is only announced when an
       * existing node's text changes, and a polite region has to exist before
       * it can be filled.
       */}
      <div className="mt-2.5 min-h-5">
        <p id={errorId} role="alert" className="text-sm font-medium text-[var(--danger)]">
          {!verified && !loading && error ? error : ''}
        </p>

        <div id={statusId} aria-live="polite">
          {verified ? (
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-1.5 text-sm font-medium text-[var(--success)]"
            >
              <Check className="size-4 shrink-0" aria-hidden />
              Code verified
            </motion.p>
          ) : loading ? (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              Checking the code
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Resend control with its cooldown.
 *
 * Deliberately not rendered anywhere. The backend has no endpoint that reissues
 * a pickup code — `ride.routes.js` exposes GET /rides/:id/otp (the customer
 * reading their existing code) and POST /rides/:id/verify-otp, and nothing
 * else — so a visible button here would be a button that lies. It is written
 * and ready: give it a deadline and a handler once the endpoint exists.
 *
 * `availableAt` is a timestamp, not a duration, so the cooldown survives a
 * reload and a backgrounded tab the same way the ride-offer countdown does.
 */
export function OtpResendCountdown({ availableAt, onResend, sending = false, className }) {
  const { seconds, expired } = useCountdown(availableAt, { totalMs: 30_000 });
  const ready = !availableAt || expired;

  return (
    <div className={cn('flex justify-center text-sm', className)}>
      {ready ? (
        <button
          type="button"
          onClick={onResend}
          disabled={sending}
          className="inline-flex min-h-12 items-center rounded-full px-4 font-medium text-accent underline underline-offset-4 transition-colors hover:bg-[var(--accent-wash)] disabled:no-underline disabled:opacity-50"
        >
          {sending ? 'Sending a new code' : 'Resend code'}
        </button>
      ) : (
        <p className="inline-flex min-h-12 items-center px-4 text-muted">
          Resend available in <span className="tabular ml-1 font-medium text-body">{seconds}s</span>
        </p>
      )}
    </div>
  );
}
