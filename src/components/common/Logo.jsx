import { RaahiTile } from '@/components/brand/RaahiMark';
import { cn } from '@/lib/utils';

/**
 * The wordmark: the road mark, and the name.
 *
 * The mark itself lives in `components/brand/RaahiMark` and its geometry in
 * `constants/brand` — one source for the header, the opening screen, the
 * loader and the favicon, so the mark in the tab and the mark in the app are
 * the same mark rather than four copies that drift.
 */
export function Logo({ className, compact = false }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <RaahiTile className="size-9" />
      {!compact && <span className="text-lg font-semibold tracking-tight text-body">Raahi</span>}
    </span>
  );
}
