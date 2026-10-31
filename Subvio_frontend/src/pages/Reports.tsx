import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Download, FileClock, FileText, IndianRupee, Repeat, TrendingUp, UserMinus, UserPlus, Wallet } from 'lucide-react';
import { Card, CardHeader, Skeleton } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { BarList, GrowthChart, RevenueTrendChart } from '@/components/charts';
import { EmptyState, ErrorState, PageHeader, PageTransition, StatCard } from '@/components/common';
import { api } from '@/lib/api';
import { cn, inputDate, inr } from '@/lib/utils';
import type { ReportSummary } from '@/types';

const PRESETS = [
  { label: '30 days', days: 30 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 182 },
  { label: '12 months', days: 365 },
];

export default function ReportsPage() {
  const [range, setRange] = useState({ from: inputDate(-182), to: inputDate() });
  const [exporting, setExporting] = useState(false);
  const valid = range.from && range.to && range.from <= range.to;

  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ['reports', 'summary', range],
    queryFn: () => api.get<ReportSummary>('/reports/summary', range),
    enabled: Boolean(valid),
    placeholderData: keepPreviousData,
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      await api.download('/reports/export', range, `subvio-invoices-${range.from}-to-${range.to}.csv`);
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title="Reports & analytics"
        description="Revenue, receivables and subscription movement for any period."
        actions={
          <Button variant="outline" onClick={exportCsv} loading={exporting} disabled={!valid}>
            <Download /> Export CSV
          </Button>
        }
      />

      <Card className="mb-5 flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => {
            const active = range.from === inputDate(-p.days) && range.to === inputDate();
            return (
              <Button key={p.label} size="sm" variant={active ? 'secondary' : 'ghost'} onClick={() => setRange({ from: inputDate(-p.days), to: inputDate() })}>
                {p.label}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={range.from} max={range.to} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} aria-label="From date" className="w-full md:w-40" />
          <span className="text-ink-muted">–</span>
          <Input type="date" value={range.to} min={range.from} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} aria-label="To date" className="w-full md:w-40" />
        </div>
      </Card>

      {!valid ? (
        <EmptyState title="Select a valid date range" message="The start date must be on or before the end date." />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : (
        <div className={cn('space-y-5 transition-opacity', isFetching && 'opacity-60')}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Collected" value={inr(data.collected)} hint={`${data.paymentsCount} payments`} icon={Wallet} />
            <StatCard label="Invoiced" value={inr(data.invoiced)} hint={`${data.invoicesCount} invoices`} icon={FileText} />
            <StatCard label="Outstanding (now)" value={inr(data.outstandingAmount)} hint={`${data.outstandingCount} invoices`} icon={FileClock} />
            <StatCard label="Overdue (now)" value={inr(data.overdueAmount)} hint={`${data.overdueCount} invoices`} icon={AlertTriangle} tone="danger" />
            <StatCard label="Active subscriptions" value={data.activeSubscriptions} icon={Repeat} />
            <StatCard label="MRR / ARR" value={inr(data.mrr)} hint={`${inr(data.arr)} annualised`} icon={TrendingUp} />
            <StatCard label="New subscriptions" value={data.newSubscriptions} hint="Started in period" icon={UserPlus} />
            <StatCard label="Closed subscriptions" value={data.closedSubscriptions} hint="Closed in period" icon={UserMinus} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Revenue by month" description="Invoiced vs collected" />
              <div className="p-4">
                <RevenueTrendChart data={data.trend} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Subscription growth" description="New subscriptions started per month" />
              <div className="p-4">
                <GrowthChart data={data.trend} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Revenue by plan" description="Invoiced amount incl. tax" />
              <div className="p-5">
                {data.byPlan.length ? <BarList items={data.byPlan.map((p) => ({ name: p.name, value: p.revenue }))} /> : <EmptyState title="No revenue in this period" />}
              </div>
            </Card>
            <Card>
              <CardHeader title="Revenue by product" description="Net line amount after discounts, excl. tax" />
              <div className="p-5">
                {data.byProduct.length ? <BarList items={data.byProduct.map((p) => ({ name: p.name, value: p.revenue }))} /> : <EmptyState title="No revenue in this period" />}
              </div>
            </Card>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <IndianRupee className="size-3.5" /> All amounts in INR. Outstanding and overdue reflect the current position, independent of the selected period.
          </p>
        </div>
      )}
    </PageTransition>
  );
}
