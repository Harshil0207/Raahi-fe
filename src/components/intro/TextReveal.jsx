import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * A word, split into characters the timeline can stagger.
 *
 * Split here rather than with GSAP's SplitText, which is a paid plugin this
 * project does not have — and for one five-letter word, a plugin that reflows
 * the DOM would be the wrong tool anyway.
 *
 * The whole word stays readable to a screen reader: the characters are
 * `aria-hidden` and the real word sits beside them in a visually hidden span.
 * Without that, a reader announces "R A A H I", which is not the brand's name.
 *
 * Nothing here animates itself. `IntroAnimation` drives it — see the note in
 * `LogoReveal` for why the timeline has a single owner.
 */
export const TextReveal = forwardRef(function TextReveal({ text, className }, ref) {
  return (
    <span ref={ref} className={cn('relative inline-flex', className)}>
      <span className="sr-only">{text}</span>

      <span aria-hidden className="inline-flex">
        {[...text].map((character, i) => (
          <span
            // Index is the right key here: the string is fixed, so a character
            // never moves and there is nothing for a stable id to protect.
            key={`${character}-${i}`}
            data-intro-char
            className="inline-block will-change-transform"
          >
            {character}
          </span>
        ))}
      </span>
    </span>
  );
});
