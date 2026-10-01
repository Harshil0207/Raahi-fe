import { cn } from '@/lib/utils';

export function Card({ className, as: Comp = 'div', elevated = false, ...props }) {
  return (
    <Comp
      className={cn(
        'rounded-[var(--radius-card)] border',
        elevated ? 'bg-elevated shadow-[var(--shadow-raise)]' : 'bg-surface',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex items-start justify-between gap-3 p-4 pb-0', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h2 className={cn('text-[15px] font-semibold text-body', className)} {...props} />;
}

export function CardBody({ className, ...props }) {
  return <div className={cn('p-4', className)} {...props} />;
}
