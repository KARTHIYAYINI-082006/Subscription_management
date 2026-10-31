import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, CheckCircle2, FileText, Pause, Pencil, Play, RefreshCw, Send, Trash2, XCircle, Zap } from 'lucide-react';
import { Card, CardHeader, Skeleton, StatusBadge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { EmptyState, ErrorState, InfoRow, PageHeader, PageTransition } from '@/components/common';
import { useConfirm } from '@/components/ConfirmProvider';
import { useAuth } from '@/context/AuthContext';
import { useAction, useItem } from '@/hooks/useResource';
import { api } from '@/lib/api';
import { PAYMENT_TERMS, periodUnit } from '@/lib/constants';
import { cn, formatDate, inputDate, inr, isOverdue } from '@/lib/utils';
import type { SubscriptionDetail as Detail, SubscriptionStatus } from '@/types';

const STEPS: SubscriptionStatus[] = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'];
const SUCCESS: Record<string, string> = {
  send: 'Quotation sent to customer',
  confirm: 'Subscription confirmed',
  activate: 'Subscription activated — billing has started',
  pause: 'Subscription paused',
  resume: 'Subscription resumed',
  renew: 'Subscription renewed',
  close: 'Subscription closed',
  cancel: 'Subscription cancelled',
  invoice: 'Invoice created',
};

function Stepper({ status }: { status: SubscriptionStatus }) {
  const current = STEPS.indexOf(status === 'PAUSED' ? 'ACTIVE' : status);
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1">
      {STEPS.map((step, i) => {
        const done = current >= 0 && i < current;
        const active = i === current;
        return (
          <li key={step} className="flex flex-1 items-center gap-1 last:flex-none">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-[11px] font-semibold',
                  done && 'bg-brand-600 text-white',
                  active && 'bg-brand-50 text-brand-600 ring-2 ring-brand-600',
                  !done && !active && 'bg-cloud text-ink-muted ring-1 ring-line',
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn('text-xs font-medium', active ? 'text-ink' : 'text-ink-muted')}>
                {step === 'ACTIVE' && status === 'PAUSED' ? 'Paused' : step.charAt(0) + step.slice(1).toLowerCase()}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className={cn('mx-2 h-px min-w-4 flex-1', done ? 'bg-brand-600' : 'bg-line')} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function SubscriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isStaff } = useAuth();
  const confirm = useConfirm();
  const query = useItem<Detail>('subscriptions', id);
  const sub = query.data;

  const invalidate = ['subscriptions', 'invoices', 'reports'];
  const act = useAction((action: string) => api.post(`/subscriptions/${id}/${action}`), { success: (_, action) => SUCCESS[action], invalidate });
  const remove = useAction(() => api.delete(`/subscriptions/${id}`), { success: 'Subscription deleted', invalidate, onSuccess: () => navigate('/subscriptions') });

  if (query.error) return <ErrorState message={query.error.message} onRetry={query.refetch} />;
  if (!sub) return <Skeleton className="h-96 w-full" />;

  const run = async (action: string, ask?: { title: string; description: string; danger?: boolean; confirmLabel?: string }) => {
    if (ask && !(await confirm(ask))) return;
    act.mutate(action);
  };

  const { plan, status } = sub;
  const expired = Boolean(sub.expiryDate && sub.expiryDate.slice(0, 10) < inputDate());
  const quoteExpired = status === 'QUOTATION' && Boolean(sub.quotationValidUntil && sub.quotationValidUntil.slice(0, 10) < inputDate());
  const busy = act.isPending || remove.isPending;

  const staffActions = [
    { show: ['DRAFT', 'QUOTATION'].includes(status), label: 'Edit', icon: Pencil, variant: 'outline' as const, onClick: () => navigate(`/subscriptions/${sub.id}/edit`) },
    { show: status === 'DRAFT', label: 'Send quotation', icon: Send, onClick: () => run('send') },
    { show: ['DRAFT', 'QUOTATION'].includes(status), label: 'Confirm', icon: CheckCircle2, onClick: () => run('confirm') },
    { show: status === 'CONFIRMED', label: 'Activate', icon: Zap, onClick: () => run('activate', { title: 'Activate subscription?', description: `Billing starts from ${formatDate(sub.startDate)}. Invoices will be generated automatically each ${periodUnit(plan.billingPeriod)}.`, confirmLabel: 'Activate' }) },
    { show: status === 'ACTIVE', label: 'Create invoice', icon: FileText, onClick: () => run('invoice', { title: 'Invoice next period?', description: `This bills the period starting ${formatDate(sub.nextInvoiceDate)}. Each period can only be billed once.`, confirmLabel: 'Create invoice' }) },
    { show: status === 'ACTIVE' && plan.pausable, label: 'Pause', icon: Pause, variant: 'outline' as const, onClick: () => run('pause', { title: 'Pause subscription?', description: 'No invoices will be generated while paused.' }) },
    { show: status === 'PAUSED', label: 'Resume', icon: Play, onClick: () => run('resume') },
    { show: ['ACTIVE', 'PAUSED'].includes(status) && plan.renewable && Boolean(sub.expiryDate), label: 'Renew', icon: RefreshCw, variant: 'outline' as const, onClick: () => run('renew', { title: 'Renew subscription?', description: `The expiry date will be extended by one ${periodUnit(plan.billingPeriod)}.`, confirmLabel: 'Renew' }) },
    { show: ['ACTIVE', 'PAUSED'].includes(status) && (plan.closable || expired), label: 'Close', icon: XCircle, variant: 'outline' as const, onClick: () => run('close', { title: 'Close subscription?', description: 'Billing stops permanently. This cannot be undone.', danger: true, confirmLabel: 'Close subscription' }) },
    { show: ['DRAFT', 'QUOTATION', 'CONFIRMED'].includes(status), label: 'Cancel', icon: XCircle, variant: 'outline' as const, onClick: () => run('cancel', { title: 'Cancel subscription?', description: 'The quotation will be marked as cancelled.', danger: true, confirmLabel: 'Cancel subscription' }) },
    { show: ['DRAFT', 'CANCELLED'].includes(status) && sub.invoices.length === 0, label: 'Delete', icon: Trash2, variant: 'outline' as const, onClick: async () => (await confirm({ title: 'Delete subscription?', description: 'This permanently removes it.', danger: true, confirmLabel: 'Delete' })) && remove.mutate() },
  ];
  const customerActions = [
    { show: status === 'QUOTATION' && !quoteExpired, label: 'Accept quotation', icon: CheckCircle2, onClick: () => run('confirm', { title: 'Accept this quotation?', description: `You agree to subscribe to ${plan.name} at ${inr(sub.preview.total)} per ${periodUnit(plan.billingPeriod)} (incl. taxes).`, confirmLabel: 'Accept' }) },
    { show: status === 'QUOTATION', label: 'Decline', icon: XCircle, variant: 'outline' as const, onClick: () => run('cancel', { title: 'Decline this quotation?', description: 'The quotation will be cancelled.', danger: true, confirmLabel: 'Decline' }) },
  ];
  const actions = (isStaff ? staffActions : customerActions).filter((a) => a.show);

  return (
    <PageTransition>
      <PageHeader
        back="/subscriptions"
        title={
          <span className="flex items-center gap-3">
            {sub.number} <StatusBadge status={status} />
          </span>
        }
        description={`${sub.customer.name} · ${plan.name}`}
        actions={actions.map(({ label, icon: Icon, onClick, variant }) => (
          <Button key={label} variant={variant ?? 'primary'} size="sm" onClick={onClick} disabled={busy}>
            <Icon /> {label}
          </Button>
        ))}
      />

      <Card className="mb-5 p-4">
        {status === 'CANCELLED' ? (
          <p className="flex items-center gap-2 text-sm text-rose-700">
            <XCircle className="size-4" /> This subscription was cancelled.
          </p>
        ) : (
          <Stepper status={status} />
        )}
        {quoteExpired && <p className="mt-3 text-xs text-rose-600">This quotation expired on {formatDate(sub.quotationValidUntil)}.</p>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Order lines" description={`Charged every ${periodUnit(plan.billingPeriod)}. Discounts reflect offers eligible today.`} />
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-cloud/70 text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-2.5 text-left font-semibold">Item</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Unit price</th>
                    <th className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Tax</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sub.preview.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">{l.description}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{l.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{inr(l.unitPrice)}</td>
                      <td className="hidden px-4 py-3 text-right text-ink-muted sm:table-cell">{l.taxRate}%</td>
                      <td className="px-4 py-3 text-right tabular-nums">{inr(l.quantity * l.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ml-auto max-w-xs space-y-1.5 border-t border-line p-4 text-sm">
              <div className="flex justify-between text-ink-muted">
                <span>Subtotal</span>
                <span className="tabular-nums text-ink">{inr(sub.preview.subtotal)}</span>
              </div>
              {sub.preview.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>{sub.preview.discount?.name}</span>
                  <span className="tabular-nums">−{inr(sub.preview.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-muted">
                <span>Taxes</span>
                <span className="tabular-nums text-ink">{inr(sub.preview.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-2 font-semibold">
                <span>Total / {periodUnit(plan.billingPeriod)}</span>
                <span className="tabular-nums">{inr(sub.preview.total)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Invoices" description="Generated automatically from this subscription" />
            <DataTable
              columns={[
                { header: 'Invoice', cell: (r) => <span className="font-medium text-brand-600">{r.number}</span> },
                { header: 'Period', cell: (r) => `${formatDate(r.periodStart)} – ${formatDate(r.periodEnd)}`, className: 'hidden sm:table-cell' },
                { header: 'Due', cell: (r) => formatDate(r.dueDate), className: 'hidden md:table-cell' },
                { header: 'Total', cell: (r) => inr(r.total), align: 'right' },
                { header: 'Status', cell: (r) => <StatusBadge status={isOverdue(r) ? 'OVERDUE' : r.status} /> },
              ]}
              rows={sub.invoices}
              onRowClick={(r) => navigate(`/invoices/${r.id}`)}
              empty={<EmptyState title="No invoices yet" message={status === 'ACTIVE' ? 'Invoices are created automatically on each billing date.' : 'Invoices start once the subscription is active.'} />}
            />
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Customer" />
            <div className="divide-y divide-line px-5 py-2">
              <InfoRow label="Name">{isStaff ? <Link to={`/subscriptions?search=${encodeURIComponent(sub.customer.email)}`} className="text-brand-600 hover:underline">{sub.customer.name}</Link> : sub.customer.name}</InfoRow>
              <InfoRow label="Email">{sub.customer.email}</InfoRow>
              {sub.customer.company && <InfoRow label="Company">{sub.customer.company}</InfoRow>}
              {sub.customer.gstin && <InfoRow label="GSTIN">{sub.customer.gstin}</InfoRow>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Terms" />
            <div className="divide-y divide-line px-5 py-2">
              <InfoRow label="Plan">{plan.name}</InfoRow>
              <InfoRow label="Billing">Every {periodUnit(plan.billingPeriod)}</InfoRow>
              <InfoRow label="Payment terms">{PAYMENT_TERMS.find((t) => Number(t.value) === sub.paymentTermDays)?.label ?? `Net ${sub.paymentTermDays} days`}</InfoRow>
              <InfoRow label="Start date">{formatDate(sub.startDate)}</InfoRow>
              <InfoRow label="Expiry date">{sub.expiryDate ? formatDate(sub.expiryDate) : 'Open-ended'}</InfoRow>
              {['DRAFT', 'QUOTATION'].includes(status) && <InfoRow label="Quote valid until">{formatDate(sub.quotationValidUntil)}</InfoRow>}
              {['ACTIVE', 'PAUSED'].includes(status) && <InfoRow label="Next invoice">{formatDate(sub.nextInvoiceDate)}</InfoRow>}
              {sub.closedAt && <InfoRow label="Closed on">{formatDate(sub.closedAt)}</InfoRow>}
            </div>
          </Card>
          {sub.notes && (
            <Card className="p-5">
              <p className="mb-1 text-xs font-medium text-ink-muted">Notes</p>
              <p className="whitespace-pre-line text-sm">{sub.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
