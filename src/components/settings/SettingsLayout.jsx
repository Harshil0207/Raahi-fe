import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { AppBar } from '@/components/common/AppBar';
import { Skeleton } from '@/components/ui/misc';
import { useMediaQuery, usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

/**
 * The settings shell: one column on a phone, two from `lg` up.
 *
 * The two layouts are genuinely different navigation, not one grid that
 * reflows. On a phone the sections are a list you drill into and come back
 * from, because that is how every settings screen on the device works and
 * because a single scroll of forty rows is unusable. On a wide screen the
 * sections are a sidebar beside the open one, because the drill-down would
 * waste two thirds of the window.
 *
 * `lg` rather than `md`: the app's own sheets already become side panels at
 * `md`, and a 768px tablet showing a sidebar plus a settings pane leaves
 * neither enough room.
 */
export function SettingsLayout({ title, sections, back, profile }) {
  const wide = useMediaQuery('(min-width: 64rem)');
  const [openId, setOpenId] = useState(null);

  const open = sections.find((section) => section.id === openId) || null;

  if (wide) {
    // On a wide screen something is always open, so the pane is never empty.
    const current = open || sections[0];

    return (
      <div className="min-h-dvh bg-app">
        <AppBar title={title} back={back} className="md:max-w-5xl" />

        <div className="mx-auto grid max-w-5xl gap-6 px-4 pb-10 lg:grid-cols-[17rem_1fr]">
          <nav aria-label={`${title} sections`} className="space-y-1">
            {profile}
            {sections.map((section) => {
              const selected = section.id === current.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => setOpenId(section.id)}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                    selected ? 'bg-surface font-medium text-body' : 'text-muted hover:bg-[var(--surface-sunken)]'
                  )}
                >
                  {section.icon && <section.icon className="size-[18px] shrink-0" aria-hidden />}
                  {section.title}
                </button>
              );
            })}
          </nav>

          <Pane section={current} />
        </div>
      </div>
    );
  }

  if (open) {
    return (
      <div className="min-h-dvh bg-app pb-safe-nav">
        {/* Back goes to the section list, not out of settings — the list is
            where the reader came from, and sending them to the profile screen
            instead is the classic drill-down mistake. */}
        <AppBar title={open.title} back={() => setOpenId(null)} />
        <div className="px-4">
          <Pane section={open} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar title={title} back={back} />

      <div className="space-y-3 px-4">
        {profile}

        <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl bg-surface">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setOpenId(section.id)}
              className={cn(
                'flex min-h-[3.5rem] w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                'hover:bg-[var(--surface-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]'
              )}
            >
              {section.icon && (
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sunken text-muted" aria-hidden>
                  <section.icon className="size-[18px]" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] text-body">{section.title}</span>
                {section.summary && (
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted">{section.summary}</span>
                )}
              </span>
              <ChevronRight className="size-[18px] shrink-0 text-muted" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** One section's rows, faded in so a drill-down does not snap. */
function Pane({ section }) {
  // The app's own setting, not just the device's — this is the screen where
  // somebody turns motion down, so it would be odd for it to ignore them.
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      key={section.id}
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5 pb-6"
    >
      {section.content}
    </motion.div>
  );
}

/**
 * What settings look like before they arrive.
 *
 * Shaped like the list it replaces — rows of the same height, in a card of the
 * same radius — so the screen does not jump when the real thing lands. A
 * centred spinner would be less work and would make the page appear to reload.
 */
export function SettingsSkeleton({ title, back }) {
  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar title={title} back={back} />
      <div className="space-y-3 px-4">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl bg-surface">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex min-h-[3.5rem] items-center gap-3 px-4 py-3">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
