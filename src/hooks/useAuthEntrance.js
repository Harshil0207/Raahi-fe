import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

gsap.registerPlugin(useGSAP);

/**
 * The entrance every auth screen shares.
 *
 * Heading, then the fields in sequence, then the provider button and the
 * footer. Short on purpose — this is the screen between somebody and the thing
 * they opened the app to do, and an animation they have to wait through is a
 * worse experience than no animation at all.
 *
 * IT USED TO CLAIM "under half a second" AND RUN FOR 0.91. The relative
 * offsets ('-=0.18' and friends) made the real tail hard to see by reading, and
 * it drifted. That mattered more than a comment being wrong: Lighthouse found
 * the landing page's Largest Contentful Paint element inside this timeline —
 * the footer line, the last thing to fade — with 964ms of render delay against
 * 11ms of server response. The animation WAS the score.
 *
 * So the positions are absolute numbers now. The tail is 0.48s, the
 * choreography is unchanged — each element still starts after the one before,
 * 40 to 80ms apart — and the total is legible from the table rather than
 * needing arithmetic across five relative offsets.
 *
 * Elements opt in with `data-auth="..."`, so a screen that has no Google button
 * or no footer simply has fewer targets and the timeline still works. Scoped to
 * the returned ref, so a selector here can never reach another screen's markup.
 *
 * REDUCED MOTION IS NOT A SHORTER ANIMATION. When it is on, nothing animates
 * and nothing is left mid-transition: the elements are set to their final
 * state and the timeline never runs. An auth form that fades in slightly for
 * somebody who asked for no motion is still motion.
 */
export function useAuthEntrance() {
  const scope = useRef(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      /**
       * Only the steps whose elements are actually on this screen.
       *
       * A screen with no Google button has no `[data-auth="google"]`, and a
       * tween aimed at nothing still consumes its slot in the timeline's
       * position arithmetic.
       */
      const steps = [
        ['[data-auth="heading"]', { y: 10 }, 0],
        ['[data-auth="field"]', { y: 8, stagger: 0.04 }, 0.06],
        ['[data-auth="submit"]', { y: 8 }, 0.14],
        ['[data-auth="google"]', { y: 8 }, 0.18],
        ['[data-auth="footer"]', {}, 0.22]
      ].filter(([selector]) => scope.current?.querySelector(selector));

      if (reduced) {
        gsap.set('[data-auth]', { opacity: 1, y: 0, clearProps: 'transform' });
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: 'power2.out', duration: 0.26 } });

      /**
       * `fromTo`, never `from`, and that distinction cost a bug worth naming.
       *
       * `gsap.from` reads the element's CURRENT value and uses it as the END of
       * the tween. If the timeline is built a second time — a re-render that
       * re-synchronises the hook, a dependency that settles after mount — the
       * value it reads is whatever the first run had reached, which for an
       * element still at the start is zero. The tween then animates from 0 to
       * 0 and the element never appears.
       *
       * That is exactly what happened here: every auth screen's primary button
       * sat at opacity 0. It was still in the layout and still clickable, so
       * every functional check passed while a person could not see the button
       * they were meant to press. `fromTo` states both ends, so a re-run lands
       * in the same place as the first.
       */
      for (const [selector, offset, position] of steps) {
        tl.fromTo(
          selector,
          { opacity: 0, ...offset, ...(offset.stagger ? { stagger: undefined } : {}) },
          { opacity: 1, y: 0, ...(offset.stagger ? { stagger: offset.stagger } : {}) },
          position
        );
      }
    },
    { scope, dependencies: [reduced], revertOnUpdate: true }
  );

  return scope;
}
