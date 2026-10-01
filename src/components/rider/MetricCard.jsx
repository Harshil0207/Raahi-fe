import { Card, CardBody } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * A compact figure with its label. Deliberately flat rather than glass — a grid
 * of glass tiles reads as noise, and these sit on an opaque page anyway.
 */
export function MetricCard({ icon: Icon, label, value, hint, tone, className }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardBody className="space-y-1.5 p-3.5">
        {Icon && (
          <span
            className={cn(
              'grid size-8 place-items-center rounded-lg bg-sunken text-faint',
              tone === 'accent' && 'bg-[var(--accent-wash)] text-accent'
            )}
          >
            <Icon className="size-[15px]" aria-hidden />
          </span>
        )}
        <p className="tabular text-[19px] font-semibold leading-tight text-body">{value}</p>
        <p className="text-[11px] leading-tight text-muted">{hint || label}</p>
      </CardBody>
    </Card>
  );
}
