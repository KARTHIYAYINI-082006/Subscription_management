import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, Skeleton, StatusBadge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable, Pagination, type Column } from '@/components/DataTable';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { EmptyState, ErrorState, NameCell, PageHeader, PageTransition, Toolbar } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { useList, useTableState } from '@/hooks/useResource';
import { SUBSCRIPTION_STATUSES, periodUnit } from '@/lib/constants';
import { formatDate, inr } from '@/lib/utils';
import type { Subscription } from '@/types';

export default function SubscriptionList() {
  const { isStaff } = useAuth();
  const navigate = useNavigate();
  const table = useTableState();
  const query = useList<Subscription>('subscriptions', table.params);

  const empty = <EmptyState title="No subscriptions found" message={table.params.search || table.status ? 'Try adjusting your filters.' : undefined} />;

  const columns: Column<Subscription>[] = [
    { header: 'Number', cell: (r) => <span className="font-medium text-brand-600">{r.number}</span> },
    ...(isStaff ? [{ header: 'Customer', cell: (r: Subscription) => <NameCell title={r.customer.name} subtitle={r.customer.company ?? r.customer.email} /> }] : []),
    { header: 'Plan', cell: (r) => r.plan.name, className: 'hidden sm:table-cell' },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { header: 'Recurring', align: 'right', cell: (r) => <span>{inr(r.recurringTotal)}<span className="text-xs text-ink-muted"> /{periodUnit(r.plan.billingPeriod)}</span></span> },
    { header: 'Start', cell: (r) => formatDate(r.startDate), className: 'hidden md:table-cell' },
    { header: 'Next invoice', cell: (r) => formatDate(r.nextInvoiceDate), className: 'hidden lg:table-cell' },
    { header: 'Expiry', cell: (r) => formatDate(r.expiryDate), className: 'hidden xl:table-cell' },
  ];

  return (
    <PageTransition>
      <PageHeader
        title={isStaff ? 'Subscriptions' : 'My subscriptions'}
        description={isStaff ? 'Every quotation and subscription with its lifecycle status.' : 'Your quotations and active subscriptions.'}
        actions={
          isStaff && (
            <Button onClick={() => navigate('/subscriptions/new')}>
              <Plus /> New subscription
            </Button>
          )
        }
      />
      <Card>
        <Toolbar
          search={table.search}
          onSearch={table.setSearch}
          placeholder={isStaff ? 'Search number, customer, plan…' : 'Search number or plan…'}
          status={table.status}
          onStatus={table.setStatus}
          statusOptions={SUBSCRIPTION_STATUSES}
        />
        {isStaff && (
          <DataTable
            columns={columns}
            rows={query.data?.data}
            loading={query.isLoading}
            error={query.error}
            onRetry={query.refetch}
            onRowClick={(r) => navigate(`/subscriptions/${r.id}`)}
            pagination={{ page: table.page, pageSize: table.params.pageSize, total: query.data?.total ?? 0, onPage: table.setPage }}
            empty={empty}
          />
        )}
      </Card>
      {!isStaff && (
        <div className="mt-5">
          {query.error ? (
            <ErrorState message={query.error.message} onRetry={query.refetch} />
          ) : !query.data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44" />
              ))}
            </div>
          ) : query.data.data.length === 0 ? (
            <Card>{empty}</Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {query.data.data.map((s) => (
                  <SubscriptionCard key={s.id} sub={s} />
                ))}
              </div>
              {query.data.total > table.params.pageSize && (
                <Card className="mt-4">
                  <Pagination page={table.page} pageSize={table.params.pageSize} total={query.data.total} onPage={table.setPage} />
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </PageTransition>
  );
}
