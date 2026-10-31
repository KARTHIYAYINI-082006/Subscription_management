import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, LogOut, Menu, Search } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useAuth, type Role } from "@/lib/auth";
import { navByRole } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Logo } from "./AuthLayout";

function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5"><Logo light /></div>
      <p className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">{role} workspace</p>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {navByRole[role].map((item) => {
          const href = item.slug ? `/${role}/${item.slug}` : `/${role}`;
          const active = path === href;
          const cls = cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          );
          const content = (<><item.icon className="size-4" />{item.title}</>);
          return item.slug ? (
            <Link key={item.slug} to="/$role/$module" params={{ role, module: item.slug }} className={cls} onClick={onNavigate}>{content}</Link>
          ) : (
            <Link key="overview" to="/$role" params={{ role }} className={cls} onClick={onNavigate}>{content}</Link>
          );
        })}
      </nav>
      <div className="m-3 flex items-center gap-3 rounded-xl bg-sidebar-accent p-3">
        <span className="grid size-9 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
          {user?.name.split(" ").map((p) => p[0]).join("")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{user?.name}</p>
          <p className="truncate text-xs">{user?.email}</p>
        </div>
        <button aria-label="Sign out" onClick={() => { logout(); navigate({ to: "/login", replace: true }); }} className="rounded-md p-1.5 hover:bg-sidebar hover:text-sidebar-accent-foreground">
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen w-full">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block"><SidebarNav role={role} /></aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0"><SidebarNav role={role} onNavigate={() => setOpen(false)} /></SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur md:px-8">
          <button className="rounded-md p-2 hover:bg-muted lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search customers, invoices, plans…" className="border-0 bg-muted pl-9" />
          </div>
          <button className="relative ml-auto rounded-lg p-2 hover:bg-muted" aria-label="Notifications">
            <Bell className="size-5 text-muted-foreground" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
          </button>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
