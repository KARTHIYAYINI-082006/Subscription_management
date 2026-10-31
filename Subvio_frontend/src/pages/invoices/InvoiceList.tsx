import { useNavigate } from 'react-router-dom';
import { Wallet, Zap } from 'lucide-react';
import { Card, StatusBadge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/DataTable';
import { EmptyState, NameCell, PageHeader, PageTransition, Toolbar } from '@/components/common';
import { useConfirm } from '@/components/ConfirmProvider';
import { useAuth } from '@/context/AuthContext';
import { useAction, useList, useTableState } from '@/hooks/useResource';
import { api } from '@/lib/api';
import { cn, formatDate, inr, isOverdue } from '@/lib/utils';
import type { Invoice } from '@/types';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CONFIRMED', label: 'Outstanding' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function InvoiceList() {
  const { isStaff } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const table = useTableState();
  const query = useList<Invoice>('invoices', table.params);

  const billing = useAction(() => api.post<{ created: number; closed: number }>('/invoices/generate'), {
    success: (r) => `Billing run complete: ${r.created} invoice${r.created === 1 ? '' : 's'} created${r.closed ? `, ${r.closed} subscription(s) auto-closed` : ''}`,
    invalidate: ['invoices', 'subscriptions', 'reports'],
  });

  const columns: Column<Invoice>[] = [
    { header: 'Invoice', cell: (r) => <span className="font-medium text-brand-600">{r.number}</span> },
    ...(isStaff ? [{ header: 'Customer', cell: (r: Invoice) => <NameCell title={r.customer.name} subtitle={r.customer.email} /> }] : []),
    { header: 'Subscription', cell: (r) => r.subscription.number, className: 'hidden lg:table-cell' },
    { header: 'Issued', cell: (r) => formatDate(r.issueDate), className: 'hidden md:table-cell' },
    { header: 'Due', cell: (r) => <span className={cn(isOverdue(r) && 'font-medium text-rose-600')}>{formatDate(r.dueDate)}</span>, className: 'hidden sm:table-cell' },
    { header: 'Total', cell: (r) => inr(r.total), align: 'right' },
    { header: 'Balance', cell: (r) => (r.status === 'CONFIRMED' ? inr(r.total - r.amountPaid) : '—'), align: 'right', className: 'hidden md:table-cell' },
    { header: 'Status', cell: (r) => <StatusBadge status={isOverdue(r) ? 'OVERDUE' : r.status} /> },
    ...(isStaff
      ? []
      : [
          {
            header: '',
            align: 'right' as const,
            cell: (r: Invoice) =>
              r.status === 'CONFIRMED' ? (
                <Button size="sm" variant="secondary" onClick={() => navigate(`/invoices/${r.id}`)}>
                  <Wallet /> Pay
                </Button>
              ) : null,
          },
        ]),
  ];

  return (
    <PageTransition>
      <PageHeader
        title={isStaff ? 'Invoices' : 'My invoices'}
        description={isStaff ? 'Recurring invoices generated from active subscriptions.' : 'Your invoices and payment status.'}
        actions={
          isStaff && (
            <Button
              loading={billing.isPending}
              onClick={async () => {
                if (await confirm({ title: 'Run billing now?', description: 'Creates invoices for every active subscription that is due today. Periods already billed are skipped, so nothing is billed twice.', confirmLabel: 'Run billing' })) {
                  billing.mutate();
                }
              }}
            >
              <Zap /> Run billing
            </Button>
          )
        }
      />
      <Card>
        <Toolbar
          search={table.search}
          onSearch={table.setSearch}
          placeholder={isStaff ? 'Search invoice, customer, subscription…' : 'Search invoice number…'}
          status={table.status}
          onStatus={table.setStatus}
          statusOptions={isStaff ? STATUS_OPTIONS : STATUS_OPTIONS.filter((o) => o.value !== 'DRAFT')}
        />
        <DataTable
          columns={columns}
          rows={query.data?.data}
          loading={query.isLoading}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={(r) => navigate(`/invoices/${r.id}`)}
          pagination={{ page: table.page, pageSize: table.params.pageSize, total: query.data?.total ?? 0, onPage: table.setPage }}
          empty={<EmptyState title="No invoices found" message={table.params.search || table.status ? 'Try adjusting your filters.' : undefined} />}
        />
      </Card>
    </PageTransition>
  );
}
