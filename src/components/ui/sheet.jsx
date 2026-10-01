import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Bottom sheet on mobile, right-hand panel from `md` up. Radix handles the
 * focus trap and escape; Framer handles the motion so a drag or a fast
 * open/close can interrupt it.
 *
 * `detent` keeps a sheet from filling the screen when it only holds a little —
 * on mobile a sheet that covers the map defeats the point of the map.
 */
export function BottomSheet({
  open,
  onOpenChange,
  children,
  dismissible = true,
  detent = 'content',
  glass = false,
  className,
  label
}) {
  return (
    <AnimatePresence>
      {open && (
        <Dialog.Root open modal onOpenChange={dismissible ? onOpenChange : undefined}>
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
              />
            </Dialog.Overlay>

            <Dialog.Content
              asChild
              forceMount
              aria-label={label}
              onPointerDownOutside={(e) => !dismissible && e.preventDefault()}
              onEscapeKeyDown={(e) => !dismissible && e.preventDefault()}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 34, stiffness: 360 }}
                // `glass` is for a sheet that sits over the map and should not
                // hide it outright. Everything else stays opaque, because text
                // over a moving map is the first thing glass ruins.
                style={
                  glass
                    ? {
                        background: 'color-mix(in oklab, var(--surface-elevated) 78%, transparent)',
                        backdropFilter: 'blur(26px) saturate(165%)',
                        WebkitBackdropFilter: 'blur(26px) saturate(165%)'
                      }
                    : undefined
                }
                className={cn(
                  'fixed inset-x-0 bottom-0 z-50 overflow-y-auto border-t shadow-[var(--shadow-sheet)]',
                  !glass && 'bg-elevated',
                  'rounded-t-[var(--radius-sheet)]',
                  detent === 'full' ? 'max-h-[92dvh]' : 'max-h-[80dvh]',
                  'md:inset-y-0 md:right-0 md:left-auto md:w-[26rem] md:max-h-none md:rounded-none md:rounded-l-[var(--radius-sheet)] md:border-l md:border-t-0',
                  className
                )}
              >
                {dismissible && (
                  <div className="sticky top-0 z-10 flex justify-center bg-inherit pt-3 pb-1 md:hidden">
                    <span className="h-1 w-10 rounded-full bg-[var(--border)]" />
                  </div>
                )}
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  );
}

export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;

export function SheetHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-2 pb-3', className)}>
      <div className="min-w-0">
        <SheetTitle className="text-lg font-semibold text-body">{title}</SheetTitle>
        {description && <SheetDescription className="mt-0.5 text-sm text-muted">{description}</SheetDescription>}
      </div>
      {action}
    </div>
  );
}
