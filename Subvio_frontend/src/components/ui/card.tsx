import type { HTMLAttributes, ReactNode } from 'react';
import { STATUS_TONE, TONE_CLASSES } from '@/lib/constants';
import { cn, titleCase } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-line/80 bg-white shadow-card', className)} {...props} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pb-3 pt-5', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold tracking-tight text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ tone = 'gray', dot, children, className }: { tone?: keyof typeof TONE_CLASSES; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset', TONE_CLASSES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? 'gray'} dot>
      {titleCase(status)}
    </Badge>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-brand-50/60', className)} />;
}
