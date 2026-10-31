import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Banknote, CheckCircle2, CreditCard, Printer, Send, XCircle } from 'lucide-react';
import { Card, Skeleton, StatusBadge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { ErrorState, Logo, PageHeader, PageTransition } from '@/components/common';
import { useConfirm } from '@/components/ConfirmProvider';
import { useAuth } from '@/context/AuthContext';
import { useAction, useItem } from '@/hooks/useResource';
import { api } from '@/lib/api';
import { COMPANY, PAYMENT_METHODS } from '@/lib/constants';
import { formatDate, inputDate, inr, isOverdue, titleCase } from '@/lib/utils';
import type { InvoiceDetail as Detail } from '@/types';

const invalidate = ['invoices', 'payments', 'subscriptions', 'reports'];

function PaymentDialog({ invoice, open, onOpenChange }: { invoice: Detail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const outstanding = Math.round((invoice.total - invoice.amountPaid) * 100) / 100;
  const schema = z.object({
    method: z.string().min(1, 'Select a method'),
    amount: z.coerce.number().positive('Enter an amount').max(outstanding, `Cannot exceed ${inr(outstanding)}`),
    date: z.string().min(1, 'Select a date'),
    note: z.string(),
  });
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema) as never,
    defaultValues: { method: 'BANK_TRANSFER', amount: outstanding, date: inputDate(), note: '' },
  });
  const record = useAction((values: z.infer<typeof schema>) => api.post(`/invoices/${invoice.id}/payments`, values), {
    success: 'Payment recorded',
    invalidate,
    onSuccess: () => onOpenChange(false),
  });
  const { errors } = formState;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record payment"
      description={`${invoice.number} · Outstanding ${inr(outstanding)}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="payment-form" loading={record.isPending}>
            Record payment
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={handleSubmit((v) => record.mutate(v))} className="space-y-4" noValidate>
        <Field label="Method" error={errors.method?.message}>
          <Select {...register('method')}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)" error={errors.amount?.message}>
            <Input type="number" step="any" min={0} {...register('amount')} />
          </Field>
          <Field label="Date" error={errors.date?.message}>
            <Input type="date" max={inputDate()} {...register('date')} />
          </Field>
        </div>
        <Field label="Note">
          <Textarea placeholder="e.g. UTR / cheque number" {...register('note')} />
        </Field>
      </form>
    </Dialog>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const { isStaff } = useAuth();
  const confirm = useConfirm();
  const [paying, setPaying] = useState(false);
  const query = useItem<Detail>('invoices', id);
  const inv = query.data;

  const act = useAction((action: string) => api.post(`/invoices/${id}/${action}`), {
    success: (_, action) => ({ confirm: 'Invoice confirmed', cancel: 'Invoice cancelled', send: 'Invoice emailed to customer', pay: 'Payment successful — thank you!' })[action] ?? 'Done',
    invalidate,
  });

  if (query.error) return <ErrorState message={query.error.message} onRetry={query.refetch} />;
  if (!inv) return <Skeleton className="h-[600px] w-full" />;

  const outstanding = inv.total - inv.amountPaid;
  const status = isOverdue(inv) ? 'OVERDUE' : inv.status;
  const ask = async (action: string, title: string, description: string, danger = false) => {
    if (await confirm({ title, description, danger, confirmLabel: title.replace('?', '') })) act.mutate(action);
  };

  const actions = [
    { show: isStaff && inv.status === 'DRAFT', label: 'Confirm', icon: CheckCircle2, primary: true, onClick: () => act.mutate('confirm') },
    { show: isStaff && inv.status === 'CONFIRMED', label: 'Record payment', icon: Banknote, primary: true, onClick: () => setPaying(true) },
    { show: !isStaff && inv.status === 'CONFIRMED', label: `Pay ${inr(outstanding)}`, icon: CreditCard, primary: true, onClick: () => ask('pay', 'Pay now?', `Complete the payment of ${inr(outstanding)} for ${inv.number}. (Demo checkout — no real money is charged.)`) },
    { show: isStaff && ['CONFIRMED', 'PAID'].includes(inv.status), label: inv.sentAt ? 'Resend' : 'Send', icon: Send, onClick: () => act.mutate('send') },
    { show: true, label: 'Print', icon: Printer, onClick: () => window.print() },
    { show: isStaff && ['DRAFT', 'CONFIRMED'].includes(inv.status) && inv.amountPaid === 0, label: 'Cancel', icon: XCircle, onClick: () => ask('cancel', 'Cancel invoice?', 'The invoice will be voided. The billing period stays marked as billed.', true) },
  ].filter((a) => a.show);

  return (
    <PageTransition>
      <PageHeader
        back="/invoices"
        title={
          <span className="flex items-center gap-3">
            {inv.number} <StatusBadge status={status} />
          </span>
        }
        description={inv.sentAt ? `Emailed on ${formatDate(inv.sentAt)}` : undefined}
        actions={actions.map(({ label, icon: Icon, onClick, primary }) => (
          <Button key={label} size="sm" variant={primary ? 'primary' : 'outline'} onClick={onClick} disabled={act.isPending}>
            <Icon /> {label}
          </Button>
        ))}
      />

      <Card className="mx-auto max-w-4xl p-6 sm:p-10 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div>
            <Logo />
            <div className="mt-4 text-xs leading-relaxed text-ink-muted">
              <p className="font-semibold text-ink">{COMPANY.name}</p>
              <p>{COMPANY.address}</p>
              <p>GSTIN: {COMPANY.gstin}</p>
              <p>{COMPANY.email}</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-2xl font-semibold tracking-tight text-ink">Tax Invoice</p>
            <p className="mt-1 font-medium text-brand-600">{inv.number}</p>
            <dl className="mt-4 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs sm:justify-end">
              <dt className="text-ink-muted">Issue date</dt>
              <dd className="font-medium">{formatDate(inv.issueDate)}</dd>
              <dt className="text-ink-muted">Due date</dt>
              <dd className="font-medium">{formatDate(inv.dueDate)}</dd>
              <dt className="text-ink-muted">Period</dt>
              <dd className="font-medium">
                {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
              </dd>
              <dt className="text-ink-muted">Subscription</dt>
              <dd className="font-medium">
                {isStaff ? (
                  <Link to={`/subscriptions/${inv.subscription.id}`} className="text-brand-600 hover:underline print:text-ink">
                    {inv.subscription.number}
                  </Link>
                ) : (
                  inv.subscription.number
                )}
              </dd>
            </dl>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-cloud p-4 text-xs leading-relaxed print:bg-transparent print:p-0">
          <p className="mb-1 font-semibold uppercase tracking-wide text-ink-muted">Bill to</p>
          <p className="text-sm font-semibold text-ink">{inv.customer.company ?? inv.customer.name}</p>
          {inv.customer.company && <p>{inv.customer.name}</p>}
          {inv.customer.address && <p>{inv.customer.address}</p>}
          <p>{inv.customer.email}</p>
          {inv.customer.gstin && <p>GSTIN: {inv.customer.gstin}</p>}
        </div>

        <div className="scrollbar-thin mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b-2 border-ink/80 text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="py-2 text-left font-semibold">Description</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Unit price</th>
                <th className="py-2 text-right font-semibold">Discount</th>
                <th className="py-2 text-right font-semibold">Tax</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {inv.lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-3 pr-4">{l.description}</td>
                  <td className="py-3 text-right tabular-nums">{l.quantity}</td>
                  <td className="py-3 text-right tabular-nums">{inr(l.unitPrice)}</td>
                  <td className="py-3 text-right tabular-nums text-ink-muted">{l.discount ? `−${inr(l.discount)}` : '—'}</td>
                  <td className="py-3 text-right tabular-nums text-ink-muted">
                    {inr(l.taxAmount)} <span className="text-[10px]">({l.taxRate}%)</span>
                  </td>
                  <td className="py-3 text-right font-medium tabular-nums">{inr(l.amount + l.taxAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div className="text-xs text-ink-muted sm:max-w-xs">
            {inv.payments.length > 0 && (
              <>
                <p className="mb-2 font-semibold uppercase tracking-wide">Payments</p>
                <ul className="space-y-1.5">
                  {inv.payments.map((p) => (
                    <li key={p.id} className="flex justify-between gap-4">
                      <span>
                        {formatDate(p.date)} · {titleCase(p.method)}
                        {p.note && <span className="block text-[11px]">{p.note}</span>}
                      </span>
                      <span className="font-medium tabular-nums text-ink">{inr(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="w-full space-y-1.5 text-sm sm:w-72">
            <div className="flex justify-between text-ink-muted">
              <span>Subtotal</span>
              <span className="tabular-nums text-ink">{inr(inv.subtotal)}</span>
            </div>
            {inv.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount{inv.discountName ? ` (${inv.discountName})` : ''}</span>
                <span className="tabular-nums">−{inr(inv.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink-muted">
              <span>Tax</span>
              <span className="tabular-nums text-ink">{inr(inv.taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{inr(inv.total)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Paid</span>
              <span className="tabular-nums text-ink">{inr(inv.amountPaid)}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-brand-50/60 px-3 py-2 font-semibold text-ink print:bg-transparent print:px-0">
              <span>Balance due</span>
              <span className="tabular-nums">{inr(inv.status === 'CANCELLED' ? 0 : outstanding)}</span>
            </div>
          </div>
        </div>
        <p className="mt-10 border-t border-line pt-4 text-center text-[11px] text-ink-muted">Thank you for your business. This is a computer-generated invoice.</p>
      </Card>

      {isStaff && inv.status === 'CONFIRMED' && <PaymentDialog key={String(paying)} invoice={inv} open={paying} onOpenChange={setPaying} />}
    </PageTransition>
  );
}
