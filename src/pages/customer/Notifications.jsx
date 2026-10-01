import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, BellOff, CheckCheck, CircleSlash, Flag, MapPin, Wallet } from 'lucide-react';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/misc';
import { useNotifications } from '@/hooks/useNotifications';
import { formatRelative } from '@/utils/format';
import { cn } from '@/lib/utils';

const ICONS = {
  RIDE_ACCEPTED: MapPin,
  RIDER_ARRIVED: MapPin,
  TRIP_STARTED: Flag,
  TRIP_COMPLETED: Flag,
  RIDE_CANCELLED: CircleSlash,
  PAYMENT_UPDATED: Wallet,
  SYSTEM: Bell
};

export default function Notifications() {
  const { notifications, unread, loaded, error, reload, markRead, markAllRead } = useNotifications();

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar
        title="Notifications"
        subtitle={unread ? `${unread} unread` : undefined}
        right={
          unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <CheckCheck aria-hidden />
              Mark all read
            </Button>
          )
        }
      />

      <div className="px-4 md:mx-auto md:max-w-2xl">
        {!loaded && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[74px] w-full rounded-[var(--radius-card)]" />
            ))}
          </div>
        )}

        {loaded && error && <ErrorState description={error} onRetry={reload} />}

        {loaded && !error && notifications.length === 0 && (
          <EmptyState
            icon={BellOff}
            title="Nothing yet"
            description="Updates about your rides — accepted, arrived, completed, paid — land here."
          />
        )}

        <ul className="space-y-2">
          {notifications.map((n, i) => {
            const Icon = ICONS[n.type] || Bell;
            const body = (
              <>
                <span
                  className={cn(
                    'mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl',
                    n.read ? 'bg-sunken text-faint' : 'bg-[var(--accent-wash)] text-accent'
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[14.5px]', n.read ? 'text-muted' : 'font-medium text-body')}>
                    {n.title}
                  </span>
                  {n.body && <span className="mt-0.5 block text-[13px] text-muted">{n.body}</span>}
                  <span className="mt-1 block text-[11px] text-faint">{formatRelative(n.createdAt)}</span>
                </span>
                {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--accent)]" aria-label="Unread" />}
              </>
            );

            const className = cn(
              'flex w-full gap-3 rounded-[var(--radius-card)] border p-3.5 text-left transition-colors',
              n.read ? 'bg-surface' : 'bg-elevated'
            );

            return (
              <motion.li
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.2), duration: 0.22 }}
              >
                {n.rideId ? (
                  <Link to={`/rides/${n.rideId}`} onClick={() => !n.read && markRead(n.id)} className={className}>
                    {body}
                  </Link>
                ) : (
                  <button type="button" onClick={() => !n.read && markRead(n.id)} className={className}>
                    {body}
                  </button>
                )}
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
