import { AlertTriangle, CalendarClock, CreditCard, DollarSign, Receipt, Repeat, TrendingUp, Users, Wallet } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { StatCard, Panel, PageHeader } from "./StatCard";
import { RevenueChart, SubscriptionPie } from "./Charts";
import { DataTable, type Column } from "./DataTable";
import { StatusBadge } from "./StatusBadge";
import { useAuth } from "@/lib/auth";
import * as m from "@/lib/mock-data";
import { fmt } from "@/lib/mock-data";

type Row = Record<string, unknown>;
const sb = (r: Row) => <StatusBadge status={String(r["status"])} />;
const amt = (r: Row) => fmt(Number(r["amount"]));
const strong = (k: string) => (r: Row) => <span className="font-medium">{String(r[k])}</span>;

const invoiceCols: Column[] = [
  { key: "id", label: "Invoice" }, { key: "customer", label: "Customer", render: strong("customer") },
  { key: "amount", label: "Amount", align: "right", render: amt }, { key: "status", label: "Status", render: sb },
];
const paymentCols: Column[] = [
  { key: "customer", label: "Customer", render: strong("customer") }, { key: "method", label: "Method" },
  { key: "amount", label: "Amount", align: "right", render: amt }, { key: "status", label: "Status", render: sb },
];

function ViewAll({ role, module }: { role: string; module: string }) {
  return <Link to="/$role/$module" params={{ role, module }} className="text-xs font-semibold text-primary hover:underline">View all</Link>;
}

function Renewals({ rows }: { rows: typeof m.subscriptions }) {
  return (
    <ul className="space-y-3">
      {rows.map((s) => (
        <li key={s.id} className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-accent text-primary"><CalendarClock className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{s.customer}</p>
            <p className="text-xs text-muted-foreground">{s.plan} · {s.nextBilling}</p>
          </div>
          <span className="text-sm font-semibold tabular-nums">{fmt(s.amount ?? 0)}</span>
        </li>
      ))}
    </ul>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const k = m.kpis;
  const upcoming = m.subscriptions.filter((s) => s.status === "Active").slice(0, 5);
  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${user?.name.split(" ")[0]}`} subtitle="Here's how Subscribo is performing this month." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total Customers" value={k.totalCustomers.toLocaleString()} icon={Users} delta={4.2} />
        <StatCard label="Active Subscriptions" value={k.activeSubscriptions.toString()} icon={Repeat} delta={2.8} tone="success" />
        <StatCard label="Monthly Recurring Revenue" value={fmt(k.mrr)} icon={TrendingUp} delta={6.1} />
        <StatCard label="Total Revenue" value={fmt(k.totalRevenue)} icon={DollarSign} delta={8.4} tone="success" />
        <StatCard label="Outstanding Payments" value={fmt(k.outstanding)} icon={Wallet} delta={-3.1} tone="warning" />
        <StatCard label="Overdue Invoices" value={k.overdue.toString()} icon={AlertTriangle} delta={-12} tone="danger" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Monthly revenue" className="xl:col-span-2"><RevenueChart /></Panel>
        <Panel title="Subscription statistics"><SubscriptionPie /></Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Recent invoices" action={<ViewAll role="admin" module="invoices" />}><DataTable compact searchable={false} rows={m.invoices.slice(0, 5)} columns={invoiceCols} /></Panel>
        <Panel title="Recent payments" action={<ViewAll role="admin" module="payments" />}><DataTable compact searchable={false} rows={m.payments.slice(0, 5)} columns={paymentCols} /></Panel>
        <Panel title="Upcoming renewals" action={<ViewAll role="admin" module="subscriptions" />}><Renewals rows={upcoming} /></Panel>
      </div>
    </div>
  );
}

export function StaffDashboard() {
  const { user } = useAuth();
  const pending = m.invoices.filter((i) => i.status === "Pending" || i.status === "Overdue");
  const active = m.subscriptions.filter((s) => s.status === "Active");
  return (
    <div className="space-y-6">
      <PageHeader title={`Good morning, ${user?.name.split(" ")[0]}`} subtitle="Your billing operations at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={m.customers.length.toString()} icon={Users} delta={3.4} />
        <StatCard label="Active Subscriptions" value={active.length.toString()} icon={Repeat} tone="success" delta={1.9} />
        <StatCard label="Pending Invoices" value={pending.length.toString()} icon={Receipt} tone="warning" />
        <StatCard label="Collected this month" value={fmt(m.payments.filter((p) => p.status === "Succeeded").reduce((a, p) => a + (p.amount ?? 0), 0))} icon={CreditCard} tone="success" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Customer overview" action={<ViewAll role="staff" module="customers" />}>
          <DataTable compact searchable={false} rows={m.customers.slice(0, 6)} columns={[{ key: "name", label: "Company", render: strong("name") }, { key: "contact", label: "Contact" }, { key: "status", label: "Status", render: sb }]} />
        </Panel>
        <Panel title="Active subscriptions" action={<ViewAll role="staff" module="subscriptions" />}>
          <DataTable compact searchable={false} rows={active.slice(0, 6)} columns={[{ key: "customer", label: "Customer", render: strong("customer") }, { key: "plan", label: "Plan" }, { key: "nextBilling", label: "Renews" }]} />
        </Panel>
        <Panel title="Pending invoices" action={<ViewAll role="staff" module="invoices" />}><DataTable compact searchable={false} rows={pending} columns={invoiceCols} /></Panel>
        <Panel title="Recent payments" action={<ViewAll role="staff" module="payments" />}><DataTable compact searchable={false} rows={m.payments.slice(0, 5)} columns={paymentCols} /></Panel>
      </div>
    </div>
  );
}

export function CustomerDashboard() {
  const { user } = useAuth();
  const me = m.CURRENT_CUSTOMER;
  const subs = m.subscriptions.filter((s) => s.customer === me || s.customer === "Hooli Cloud");
  const invs = m.invoices.filter((i) => i.customer === me);
  const pays = m.payments.filter((p) => p.customer === me);
  const outstanding = invs.filter((i) => i.status !== "Paid").reduce((a, i) => a + (i.amount ?? 0), 0);
  return (
    <div className="space-y-6">
      <PageHeader title={`Hi ${user?.name.split(" ")[0]}`} subtitle={`${me} · Billing account`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Subscriptions" value={subs.filter((s) => s.status === "Active").length.toString()} icon={Repeat} tone="success" />
        <StatCard label="Next Renewal" value={subs[0]?.nextBilling ?? "—"} icon={CalendarClock} />
        <StatCard label="Invoices" value={invs.length.toString()} icon={Receipt} />
        <StatCard label="Outstanding Balance" value={fmt(outstanding)} icon={Wallet} tone={outstanding ? "warning" : "success"} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="My active subscriptions" className="xl:col-span-2" action={<ViewAll role="customer" module="subscriptions" />}>
          <DataTable compact searchable={false} rows={subs} columns={[{ key: "plan", label: "Plan", render: strong("plan") }, { key: "amount", label: "Amount", align: "right", render: amt }, { key: "nextBilling", label: "Next billing" }, { key: "status", label: "Status", render: sb }]} />
        </Panel>
        <Panel title="Upcoming renewals"><Renewals rows={subs} /></Panel>
        <Panel title="My invoices" className="xl:col-span-2" action={<ViewAll role="customer" module="invoices" />}>
          <DataTable compact searchable={false} rows={invs} columns={[{ key: "id", label: "Invoice" }, { key: "due", label: "Due" }, { key: "amount", label: "Amount", align: "right", render: amt }, { key: "status", label: "Status", render: sb }]} />
        </Panel>
        <Panel title="Payment history" action={<ViewAll role="customer" module="payments" />}>
          <DataTable compact searchable={false} rows={pays} columns={[{ key: "date", label: "Date" }, { key: "amount", label: "Amount", align: "right", render: amt }, { key: "status", label: "Status", render: sb }]} />
        </Panel>
      </div>
    </div>
  );
}
