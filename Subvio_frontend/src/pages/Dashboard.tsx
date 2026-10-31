import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  BarChart3,
  Boxes,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileClock,
  Layers,
  Plus,
  Repeat,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader, Skeleton, StatusBadge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarList, RevenueTrendChart } from '@/components/charts';
import { ErrorState, PageTransition, StatCard } from '@/components/common';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { cn, formatDate, inr, isOverdue, titleCase } from '@/lib/utils';
import type { CustomerDashboard, StaffDashboard } from '@/types';

/* ------------------------------- Shared pieces ------------------------------- */
function useDashboard<T>() {
  return useQuery({ queryKey: ['reports', 'dashboard'], queryFn: () => api.get<T>('/reports/dashboard') });
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const today = () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

function Hero({ eyebrow, title, children, actions }: { eyebrow: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="hero-gradient relative mb-6 overflow-hidden rounded-3xl p-6 text-white shadow-glow sm:p-8">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-40 [mask-image:none]" />
      <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-brand-300/20 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          {children}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-white/70">{label}</p>
      <p className="mt-1 text-lg font-extrabold tracking-tight sm:text-2xl">{value}</p>
    </div>
  );
}

function ListCard<T extends { id: string }>({ title, items, empty, render, to, more }: { title: string; items: T[]; empty: string; render: (item: T) => ReactNode; to: (item: T) => string; more?: string }) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title={title}
        action={
          more && (
            <Link to={more} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
              View all <ArrowRight className="size-3.5" />
            </Link>
          )
        }
      />
      {items.length ? (
        <ul className="flex-1 space-y-1 px-2 pb-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link to={to(item)} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-cloud">
                {render(item)}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex flex-1 items-center justify-center px-5 pb-8 pt-4 text-center text-xs text-ink-muted">{empty}</p>
      )}
    </Card>
  );
}

const Row = ({ title, subtitle, right }: { title: ReactNode; subtitle: ReactNode; right: ReactNode }) => (
  <>
    <div className="min-w-0">
      <p className="truncate font-semibold text-ink">{title}</p>
      <p className="truncate text-xs text-ink-muted">{subtitle}</p>
    </div>
    <div className="shrink-0 text-right">{right}</div>
  </>
);

function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-44 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

function Shortcut({ to, icon: Icon, label, hint }: { to: string; icon: LucideIcon; label: string; hint: string }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">{label}</p>
        <p className="truncate text-xs text-ink-muted">{hint}</p>
      </div>
      <ArrowUpRight className="size-4 text-ink-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

const overdueRow = (i: StaffDashboard['overdueInvoices'][number]) => (
  <Row title={i.customer.name} subtitle={`${i.number} · due ${formatDate(i.dueDate)}`} right={<span className="font-bold text-rose-600">{inr(i.total - i.amountPaid)}</span>} />
);
const renewalRow = (s: StaffDashboard['upcomingRenewals'][number]) => (
  <Row title={s.customer.name} subtitle={`${s.number} · ${s.plan.name}`} right={<span className="flex items-center gap-1 text-xs font-semibold text-ink-muted"><CalendarClock className="size-3.5" />{formatDate(s.expiryDate)}</span>} />
);
const subscriptionRow = (s: StaffDashboard['recentSubscriptions'][number]) => <Row title={s.customer.name} subtitle={`${s.number} · ${s.plan.name}`} right={<StatusBadge status={s.status} />} />;

function StatusBreakdown({ data }: { data: StaffDashboard }) {
  return (
    <Card>
      <CardHeader title="Subscriptions by status" />
      <div className="px-5 pb-5">
        <BarList items={data.statusDistribution.map((s) => ({ name: titleCase(s.status), value: s.count }))} format={(v) => String(v)} />
      </div>
    </Card>
  );
}

/* -------------------------------- Admin view -------------------------------- */
function AdminView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, error, refetch } = useDashboard<StaffDashboard>();
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return <Loading />;

  return (
    <>
      <Hero
        eyebrow="Command center"
        title={`${greeting()}, ${user?.name.split(' ')[0]}`}
        actions={
          <>
            <Button variant="light" onClick={() => navigate('/reports')}>
              <BarChart3 /> Reports
            </Button>
            <Button onClick={() => navigate('/subscriptions/new')} className="bg-white/15 from-white/15 to-white/15 ring-1 ring-white/30 hover:bg-white/25">
              <Plus /> New subscription
            </Button>
          </>
        }
      >
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 sm:gap-10">
          <HeroMetric label="Monthly recurring" value={inr(data.mrr)} />
          <HeroMetric label="Annual run-rate" value={inr(data.arr)} />
          <HeroMetric label="Collected this month" value={inr(data.revenueThisMonth)} />
        </div>
      </Hero>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Customers" value={data.customers} hint={`${data.products} products in catalog`} icon={Users} />
          <StatCard label="Active subscriptions" value={data.activeSubscriptions} icon={Repeat} />
          <StatCard label="Outstanding" value={inr(data.outstandingAmount)} hint={`${data.outstandingCount} unpaid invoices`} icon={FileClock} />
          <StatCard label="Overdue" value={inr(data.overdueAmount)} hint={`${data.overdueCount} past due`} icon={AlertTriangle} tone="danger" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Revenue" description="Invoiced vs collected · last 6 months" />
            <div className="px-3 pb-4">
              <RevenueTrendChart data={data.trend} />
            </div>
          </Card>
          <StatusBreakdown data={data} />
        </div>

        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">Configuration</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Shortcut to="/products" icon={Boxes} label="Products" hint="Variants, prices & taxes" />
            <Shortcut to="/plans" icon={Layers} label="Plans" hint="Billing cycles & rules" />
            <Shortcut to="/discounts" icon={BadgePercent} label="Discounts" hint="Automatic offers" />
            <Shortcut to="/staff" icon={ShieldCheck} label="Staff" hint="Team access" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <ListCard title="Overdue invoices" items={data.overdueInvoices} empty="No overdue invoices 🎉" to={(i) => `/invoices/${i.id}`} more="/invoices?status=OVERDUE" render={overdueRow} />
          <ListCard title="Upcoming renewals" items={data.upcomingRenewals} empty="No renewals in the next 30 days" to={(s) => `/subscriptions/${s.id}`} render={renewalRow} />
          <ListCard title="Recent subscriptions" items={data.recentSubscriptions} empty="No subscriptions yet" to={(s) => `/subscriptions/${s.id}`} more="/subscriptions" render={subscriptionRow} />
        </div>
      </div>
    </>
  );
}

/* -------------------------------- Staff view -------------------------------- */
function FocusTile({ to, icon: Icon, label, value, hint, tone }: { to: string; icon: LucideIcon; label: string; value: ReactNode; hint: string; tone: 'rose' | 'amber' | 'violet' | 'emerald' }) {
  const tones = {
    rose: 'from-rose-50 to-white text-rose-600 ring-rose-100',
    amber: 'from-amber-50 to-white text-amber-600 ring-amber-100',
    violet: 'from-brand-50 to-white text-brand-600 ring-brand-300/30',
    emerald: 'from-emerald-50 to-white text-emerald-600 ring-emerald-100',
  };
  return (
    <Link to={to} className={cn('group relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 ring-1 transition-all hover:-translate-y-0.5 hover:shadow-lift', tones[tone])}>
      <div className="flex items-center justify-between">
        <Icon className="size-5" />
        <ArrowUpRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-4 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-sm font-bold text-ink">{label}</p>
      <p className="text-xs text-ink-muted">{hint}</p>
    </Link>
  );
}

function StaffView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, error, refetch } = useDashboard<StaffDashboard>();
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return <Loading />;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600/80">{today()}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
            {greeting()}, {user?.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">Here's what needs your attention today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/customers')}>
            <UserPlus /> Customers
          </Button>
          <Button onClick={() => navigate('/subscriptions/new')}>
            <Plus /> New subscription
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <FocusTile to="/invoices?status=OVERDUE" icon={AlertTriangle} tone="rose" label="Overdue to chase" value={data.overdueCount} hint={`${inr(data.overdueAmount)} past due`} />
          <FocusTile to="/invoices?status=CONFIRMED" icon={CreditCard} tone="amber" label="Awaiting payment" value={data.outstandingCount} hint={`${inr(data.outstandingAmount)} outstanding`} />
          <FocusTile to="/subscriptions?status=QUOTATION" icon={FileClock} tone="violet" label="Quotations out" value={data.statusDistribution.find((s) => s.status === 'QUOTATION')?.count ?? 0} hint="Waiting on customers" />
          <FocusTile to="/subscriptions?status=ACTIVE" icon={CheckCircle2} tone="emerald" label="Active subscriptions" value={data.activeSubscriptions} hint={`${data.customers} customers`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ListCard title="Follow-up queue" items={data.overdueInvoices} empty="Nothing to chase. All caught up 🎉" to={(i) => `/invoices/${i.id}`} more="/invoices?status=OVERDUE" render={overdueRow} />
          <ListCard title="Renewals in the next 30 days" items={data.upcomingRenewals} empty="No renewals coming up" to={(s) => `/subscriptions/${s.id}`} render={renewalRow} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <ListCard title="Latest subscriptions" items={data.recentSubscriptions} empty="No subscriptions yet" to={(s) => `/subscriptions/${s.id}`} more="/subscriptions" render={subscriptionRow} />
          <StatusBreakdown data={data} />
        </div>
      </div>
    </>
  );
}

/* ------------------------------- Customer view ------------------------------- */
function CustomerView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, error, refetch } = useDashboard<CustomerDashboard>();
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return <Loading />;
  const nextDue = data.invoices.find((i) => i.status === 'CONFIRMED');

  return (
    <>
      <Hero
        eyebrow="Your account"
        title={`${greeting()}, ${user?.name.split(' ')[0]}`}
        actions={
          nextDue ? (
            <Button variant="light" size="lg" onClick={() => navigate(`/invoices/${nextDue.id}`)}>
              <Wallet /> Pay {inr(nextDue.total - nextDue.amountPaid)}
            </Button>
          ) : (
            <span className="flex items-center gap-2 rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-300/30">
              <CheckCircle2 className="size-4" /> You're all caught up
            </span>
          )
        }
      >
        <div className="mt-6 grid grid-cols-2 gap-6 sm:flex sm:gap-10">
          <HeroMetric label="Amount due" value={inr(data.outstandingAmount)} />
          <HeroMetric label="Unpaid invoices" value={String(data.unpaidInvoices)} />
          <HeroMetric label="Active plans" value={String(data.activeSubscriptions)} />
          <HeroMetric label="Total paid" value={inr(data.totalPaid)} />
        </div>
      </Hero>

      {data.pendingQuotations > 0 && (
        <Link to="/subscriptions?status=QUOTATION" className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-brand-300/40 bg-brand-50/60 px-5 py-4 transition-colors hover:bg-brand-50">
          <span className="flex items-center gap-3 text-sm font-semibold text-ink">
            <FileClock className="size-5 text-brand-600" />
            You have {data.pendingQuotations} quotation{data.pendingQuotations > 1 ? 's' : ''} waiting for your review
          </span>
          <ArrowRight className="size-4 text-brand-600" />
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-ink">My subscriptions</h2>
            <Link to="/subscriptions" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {data.subscriptions.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.subscriptions.map((s) => (
                <SubscriptionCard key={s.id} sub={s} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-sm text-ink-muted">You have no subscriptions yet.</Card>
          )}
        </section>
        <ListCard
          title="Recent invoices"
          items={data.invoices}
          empty="No invoices yet"
          to={(i) => `/invoices/${i.id}`}
          more="/invoices"
          render={(i) => <Row title={i.number} subtitle={`Due ${formatDate(i.dueDate)}`} right={<div className="flex items-center gap-2"><span className="font-bold">{inr(i.total)}</span><StatusBadge status={isOverdue(i) ? 'OVERDUE' : i.status} /></div>} />}
        />
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const View = user?.role === 'ADMIN' ? AdminView : user?.role === 'STAFF' ? StaffView : CustomerView;
  return (
    <PageTransition>
      <View />
    </PageTransition>
  );
}
