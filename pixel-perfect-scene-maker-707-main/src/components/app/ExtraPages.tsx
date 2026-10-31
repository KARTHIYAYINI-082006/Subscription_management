import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader, Panel, StatCard } from "./StatCard";
import { MonthlyBars, RevenueChart, SubscriptionPie } from "./Charts";
import { useAuth } from "@/lib/auth";
import * as m from "@/lib/mock-data";
import { fmt } from "@/lib/mock-data";
import { DollarSign, TrendingUp, Users, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Revenue and retention analytics" actions={<Button variant="outline" onClick={() => toast.success("Report exported")}>Export PDF</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="ARR" value={fmt(m.kpis.mrr * 12)} icon={TrendingUp} delta={6.1} />
        <StatCard label="ARPU" value={fmt(Math.round(m.kpis.mrr / m.kpis.activeSubscriptions))} icon={DollarSign} delta={1.2} />
        <StatCard label="Churn rate" value="2.4%" icon={Percent} delta={-0.6} tone="warning" />
        <StatCard label="New customers (30d)" value="54" icon={Users} delta={9.3} tone="success" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Revenue vs MRR"><RevenueChart /></Panel>
        <Panel title="Monthly revenue"><MonthlyBars /></Panel>
        <Panel title="Subscription mix"><SubscriptionPie /></Panel>
      </div>
    </div>
  );
}

function Field({ label, defaultValue, type = "text" }: { label: string; defaultValue: string; type?: string }) {
  const id = label.replace(/\s/g, "");
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} defaultValue={defaultValue} /></div>;
}

export function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" subtitle="Workspace and billing preferences" />
      <Panel title="Organization">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); toast.success("Settings saved"); }}>
          <Field label="Company name" defaultValue="Subscribo Inc." />
          <Field label="Billing email" defaultValue="billing@subscribo.io" type="email" />
          <Field label="Default currency" defaultValue="USD" />
          <Field label="Invoice prefix" defaultValue="INV-" />
          <div className="sm:col-span-2"><Button type="submit">Save changes</Button></div>
        </form>
      </Panel>
      <Panel title="Notifications">
        <div className="space-y-4">
          {["Email me when a payment fails", "Send renewal reminders 7 days before billing", "Weekly revenue summary"].map((t, i) => (
            <label key={t} className="flex items-center justify-between gap-4 text-sm"><span>{t}</span><Switch defaultChecked={i !== 2} /></label>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Profile" subtitle="Your personal and billing details" />
      <Panel title="Personal information">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); toast.success("Profile updated"); }}>
          <Field label="Full name" defaultValue={user?.name ?? ""} />
          <Field label="Email" defaultValue={user?.email ?? ""} type="email" />
          <Field label="Company" defaultValue={m.CURRENT_CUSTOMER} />
          <Field label="Phone" defaultValue="+1 555 0110" />
          <div className="sm:col-span-2"><Button type="submit">Update profile</Button></div>
        </form>
      </Panel>
      <Panel title="Payment method">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm"><p className="font-medium">Visa ending in 4242</p><p className="text-muted-foreground">Expires 08/2028</p></div>
          <Button variant="outline" onClick={() => toast.success("Card update link sent to your email")}>Update card</Button>
        </div>
      </Panel>
    </div>
  );
}

export function AvailablePlans() {
  const [chosen, setChosen] = useState<(typeof m.plans)[number] | null>(null);
  return (
    <div>
      <PageHeader title="Available Plans" subtitle="Upgrade or add a subscription anytime" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {m.plans.map((p, i) => (
          <div key={p.id} className={cn("flex flex-col rounded-xl border bg-card p-6 shadow-card", i === 1 && "border-primary ring-2 ring-primary/20")}>
            {i === 1 && <span className="mb-3 w-fit rounded-full bg-gradient-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">Most popular</span>}
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <p className="mt-2"><span className="text-3xl font-bold">{fmt(p.price)}</span><span className="text-sm text-muted-foreground">/{p.interval === "Monthly" ? "mo" : "yr"}</span></p>
            <ul className="mt-5 flex-1 space-y-2">
              {p.features.map((f) => <li key={f} className="flex items-center gap-2 text-sm"><Check className="size-4 text-success" />{f}</li>)}
            </ul>
            <Button className="mt-6" variant={i === 1 ? "default" : "outline"} onClick={() => setChosen(p)}>Choose {p.name}</Button>
          </div>
        ))}
      </div>
      <Dialog open={!!chosen} onOpenChange={(o) => !o && setChosen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to {chosen?.name}</DialogTitle>
            <DialogDescription>You'll be billed {chosen && fmt(chosen.price)} {chosen?.interval.toLowerCase()} to Visa •••• 4242.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChosen(null)}>Cancel</Button>
            <Button onClick={() => { toast.success(`Subscribed to ${chosen?.name}`); setChosen(null); }}>Confirm subscription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
