import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LifeBuoy, Plus } from 'lucide-react';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton, StatusBadge } from '@/components/ui/misc';
import { useComplaints } from '@/hooks/useComplaints';
import { useSupportPaths } from '@/hooks/useSupportPaths';
import { OPEN_STATUSES, STATUS_LABEL, STATUS_TONE, categoryLabel } from '@/constants/complaint';
import { formatRelative } from '@/utils/format';
import { cn } from '@/lib/utils';

/**
 * The reporter's own complaints, newest first.
 *
 * Open ones first is deliberately *not* what happens: the newest is what someone
 * came to check, and a list that reorders itself when something resolves is
 * harder to navigate than one that stays put.
 */
export default function MyComplaints() {
  const { complaints, loaded, error, reload } = useComplaints();
  const paths = useSupportPaths();

  const open = complaints.filter((complaint) => OPEN_STATUSES.includes(complaint.status)).length;

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar
        title="Your reports"
        back={paths.help}
        subtitle={open ? `${open} still open` : undefined}
        right={
          <Button asChild variant="subtle" size="sm">
            <Link to={paths.create}>
              <Plus aria-hidden />
              New
            </Link>
          </Button>
        }
      />

      <div className="space-y-2 px-4 md:mx-auto md:max-w-2xl">
        {!loaded && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[82px] w-full rounded-[var(--radius-card)]" />
            ))}
          </>
        )}

        {loaded && error && <ErrorState description={error} onRetry={reload} />}

        {loaded && !error && complaints.length === 0 && (
          <EmptyState
            icon={LifeBuoy}
            title="Nothing reported"
            description="If something goes wrong on a trip, report it here and support will pick it up."
          />
        )}

        {complaints.map((complaint, index) => (
          <motion.div
            key={complaint.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.22 }}
          >
            <Link to={paths.detail(complaint.id)} className="block">
              <Card className={cn('transition-colors', complaint.unread > 0 && 'border-[var(--accent)]')}>
                <CardBody className="py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-body">{complaint.subject}</p>
                      <p className="mt-0.5 truncate text-[12.5px] text-muted">
                        {categoryLabel(complaint.category)} · {formatRelative(complaint.createdAt)}
                      </p>
                    </div>

                    {complaint.unread > 0 && (
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--accent)]" aria-label="New reply" />
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <StatusBadge tone={STATUS_TONE[complaint.status]}>
                      {STATUS_LABEL[complaint.status] || complaint.status}
                    </StatusBadge>
                    <span className="mono text-[11px] text-faint">{complaint.reference}</span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
