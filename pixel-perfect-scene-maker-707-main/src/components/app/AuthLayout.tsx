import { useState, type ReactNode } from "react";
import { Eye, EyeOff, Check, X, Repeat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { passwordChecks } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant"><Repeat className="size-5" /></span>
      <span className={cn("text-lg font-bold tracking-tight", light ? "text-sidebar-accent-foreground" : "text-foreground")}>Subscribo</span>
    </div>
  );
}

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between bg-gradient-auth p-12 lg:flex">
        <Logo light />
        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight text-sidebar-accent-foreground">Recurring billing, without the busywork.</h2>
          <p className="mt-4 max-w-md text-sidebar-foreground">Quotations, subscriptions, invoices and payments — managed in one calm, reliable workspace.</p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
            {[["$1.28M", "Billed yearly"], ["812", "Active subs"], ["99.9%", "Uptime"]].map(([v, l]) => (
              <div key={l} className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-4">
                <p className="text-xl font-bold text-sidebar-accent-foreground">{v}</p>
                <p className="text-xs text-sidebar-foreground">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-sidebar-foreground">© 2026 Subscribo</p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function PasswordInput({ value, onChange, showRules, id = "password" }: { value: string; onChange: (v: string) => void; showRules?: boolean; id?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="relative">
        <Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder="••••••••" className="pr-10" />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showRules && value && (
        <ul className="mt-2 grid grid-cols-2 gap-1">
          {passwordChecks(value).map((c) => (
            <li key={c.label} className={cn("flex items-center gap-1 text-xs", c.ok ? "text-success" : "text-muted-foreground")}>
              {c.ok ? <Check className="size-3" /> : <X className="size-3" />}{c.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
