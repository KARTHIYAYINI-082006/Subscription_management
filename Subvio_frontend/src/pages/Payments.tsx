import { useNavigate } from 'react-router-dom';
import { Card, Badge } from '@/components/ui/card';
import { DataTable } from '@/components/DataTable';
import { EmptyState, PageHeader, PageTransition, Toolbar } from '@/components/common';
import { useList, useTableState } from '@/hooks/useResource';
import { PAYMENT_METHODS } from '@/lib/constants';
import { formatDate, inr } from '@/lib/utils';
import type { Payment } from '@/types';

export default function PaymentsPage() {
  const navigate = useNavigate();
  const table = useTableState();
  const query = useList<Payment>('payments', table.params);
  const methodLabel = (m: string) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;

  return (
    <PageTransition>
      <PageHeader title="Payments" description="Every payment recorded against an invoice." />
      <Card>
        <Toolbar
          search={table.search}
          onSearch={table.setSearch}
          placeholder="Search invoice, customer, note…"
          status={table.status}
          onStatus={table.setStatus}
          statusOptions={PAYMENT_METHODS}
          statusLabel="All methods"
        />
        <DataTable
          columns={[
            { header: 'Date', cell: (r) => formatDate(r.date) },
            { header: 'Invoice', cell: (r) => <span className="font-medium text-brand-600">{r.invoice?.number}</span> },
            { header: 'Customer', cell: (r) => r.invoice?.customer.name, className: 'hidden sm:table-cell' },
            { header: 'Method', cell: (r) => <Badge tone="violet">{methodLabel(r.method)}</Badge>, className: 'hidden md:table-cell' },
            { header: 'Note', cell: (r) => <span className="text-ink-muted">{r.note ?? '—'}</span>, className: 'hidden lg:table-cell' },
            { header: 'Amount', cell: (r) => inr(r.amount), align: 'right' },
          ]}
          rows={query.data?.data}
          loading={query.isLoading}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={(r) => r.invoice && navigate(`/invoices/${r.invoice.id}`)}
          pagination={{ page: table.page, pageSize: table.params.pageSize, total: query.data?.total ?? 0, onPage: table.setPage }}
          empty={<EmptyState title="No payments found" />}
        />
      </Card>
    </PageTransition>
  );
}
