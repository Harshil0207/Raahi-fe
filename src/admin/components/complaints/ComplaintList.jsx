import { Link } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import { Badge, EmptyState } from '@/admin/components/ui/misc';
import { COMPLAINT_STATUS_LABEL, COMPLAINT_STATUS_TONE, PRIORITY_TONE, categoryLabel } from '@/admin/constants/status';
import { formatDue, formatRelative, humanise } from '@/admin/utils/format';

/**
 * A compact complaint list, reused on the detail pages of whatever the
 * complaint is about.
 */
export function ComplaintList({ complaints, showReporter = false }) {
  if (!complaints?.length) {
    return <EmptyState icon={LifeBuoy} title="No complaints" />;
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {complaints.map((complaint) => {
        const due = formatDue(complaint.dueAt);

        return (
          <li key={complaint.id}>
            <Link
              to={`/admin/complaints/${complaint.id}`}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-body">{complaint.subject}</p>
                <p className="mt-0.5 truncate text-[11.5px] text-muted">
                  <span className="mono">{complaint.reference}</span> · {categoryLabel(complaint.category)}
                  {showReporter && complaint.userRole ? ` · from the ${complaint.userRole}` : ''} ·{' '}
                  {formatRelative(complaint.createdAt)}
                </p>
              </div>

              {/* Only shown while it still matters — a resolved complaint's
                  deadline is history, not a warning. */}
              {complaint.isOverdue && (
                <span className="hidden shrink-0 text-[11.5px] font-medium text-[var(--danger)] sm:block">
                  {due.label}
                </span>
              )}

              <Badge tone={PRIORITY_TONE[complaint.priority]} className="shrink-0">
                {humanise(complaint.priority)}
              </Badge>
              <Badge tone={COMPLAINT_STATUS_TONE[complaint.status]} className="shrink-0">
                {COMPLAINT_STATUS_LABEL[complaint.status] || complaint.status}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
