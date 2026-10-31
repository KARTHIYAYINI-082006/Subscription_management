import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Subscribo – Subscription Management System" },
      { name: "description", content: "Manage customers, subscriptions, invoices and payments in one place with Subscribo." },
      { property: "og:title", content: "Subscribo – Subscription & Recurring Billing" },
      { property: "og:description", content: "Manage customers, subscriptions, invoices and payments in one place." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!ready) return;
    if (user) navigate({ to: "/$role", params: { role: user.role }, replace: true });
    else navigate({ to: "/login", replace: true });
  }, [ready, user, navigate]);
  return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading Subscribo…</div>;
}
