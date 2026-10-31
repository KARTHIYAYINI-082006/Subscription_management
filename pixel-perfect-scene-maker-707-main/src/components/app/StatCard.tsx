import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, icon: Icon, delta, tone = "primary" }: {
  label: string; value: string; icon: LucideIcon; delta?: number; tone?: "primary" | "success" | "warning" | "danger";
}) {
  const toneCls = {
    primary: "bg-accent text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    danger: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-lg", toneCls)}><Icon className="size-4.5" /></span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      {delta !== undefined && (
        <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", delta >= 0 ? "text-success" : "text-destructive")}>
          {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {Math.abs(delta)}% <span className="font-normal text-muted-foreground">vs last month</span>
        </p>
      )}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-card", className)}>
      <header className="flex items-center justify-between border-b px-5 py-3.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
