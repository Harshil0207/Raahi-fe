import { forwardRef } from 'react';
import { RaahiTile } from '@/components/brand/RaahiMark';
import { cn } from '@/lib/utils';

/**
 * The mark as it appears on the opening screen.
 *
 * Deliberately holds no animation of its own. `IntroAnimation` owns the
 * timeline and drives this through the `data-` hooks below, because the reveal
 * has to be interruptible — the app can become ready at any point, and a
 * component animating itself on mount cannot be told "finish from where you
 * are". One timeline, one owner.
 */
export const LogoReveal = forwardRef(function LogoReveal({ className }, ref) {
  return (
    <div ref={ref} className={cn('relative grid place-items-center', className)}>
      {/**
       * The halo. A single soft wash behind the tile so the mark is not a black
       * square floating on a black screen in dark mode — it gives the tile an
       * edge without drawing a border, which would read as a UI element rather
       * than a logo.
       */}
      <span
        data-intro-halo
        aria-hidden
        className="absolute size-[7.5rem] rounded-full opacity-0"
        style={{
          background:
            'radial-gradient(circle, color-mix(in oklab, var(--accent) 14%, transparent) 0%, transparent 68%)'
        }}
      />

      <RaahiTile
        data-intro-tile
        animated
        className="size-[4.5rem] rounded-[1.375rem] shadow-[var(--shadow-float)]"
        markClassName="size-9"
      />
    </div>
  );
});
