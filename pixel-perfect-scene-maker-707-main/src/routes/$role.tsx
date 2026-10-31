import { createFileRoute, notFound, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth, type Role } from "@/lib/auth";

const roles: Role[] = ["admin", "staff", "customer"];

export const Route = createFileRoute("/$role")({
  beforeLoad: ({ params }) => { if (!roles.includes(params.role as Role)) throw notFound(); },
  head: () => ({ meta: [{ title: "Subscribo – Subscription Management System" }, { name: "description", content: "Subscribo billing workspace." }, { property: "og:title", content: "Subscribo workspace" }, { property: "og:description", content: "Subscription and recurring billing workspace." }, { name: "robots", content: "noindex" }] }),
  component: RoleLayout,
});

function RoleLayout() {
  const { role } = Route.useParams();
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!ready) return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (user.role !== role) navigate({ to: "/$role", params: { role: user.role }, replace: true });
  }, [ready, user, role, navigate]);
  if (!ready || !user || user.role !== role) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  return <AppShell role={role as Role}><Outlet /></AppShell>;
}
