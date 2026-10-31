import { Link } from 'react-router-dom';
import { Repeat } from 'lucide-react';
import { StatusBadge } from '@/components/ui/card';
import { periodUnit } from '@/lib/constants';
import { formatDate, inr } from '@/lib/utils';
import type { Subscription } from '@/types';

/** Card used in the customer portal for a single subscription. */
export function SubscriptionCard({ sub }: { sub: Subscription }) {
  return (
    <Link to={`/subscriptions/${sub.id}`} className="group flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-glow">
          <Repeat className="size-5" />
        </span>
        <StatusBadge status={sub.status} />
      </div>
      <p className="mt-4 font-bold text-ink">{sub.plan.name}</p>
      <p className="text-xs text-ink-muted">
        {sub.number}
        {sub.plan.billingPeriod && ` · billed every ${periodUnit(sub.plan.billingPeriod)}`}
      </p>
      <div className="mt-4 flex items-end justify-between gap-2 border-t border-line pt-3 text-xs text-ink-muted">
        <span>Since {formatDate(sub.startDate)}</span>
        {sub.recurringTotal !== undefined && (
          <span className="text-sm font-bold text-ink">
            {inr(sub.recurringTotal)}
            <span className="text-xs font-medium text-ink-muted">/{periodUnit(sub.plan.billingPeriod)}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
