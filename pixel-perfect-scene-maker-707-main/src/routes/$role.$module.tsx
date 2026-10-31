import { createFileRoute, notFound } from "@tanstack/react-router";
import { ModulePage } from "@/components/app/ModulePage";
import { allowedModules, modules } from "@/components/app/modules";
import { AvailablePlans, ProfilePage, ReportsPage, SettingsPage } from "@/components/app/ExtraPages";
import { CURRENT_CUSTOMER } from "@/lib/mock-data";
import type { Role } from "@/lib/auth";

export const Route = createFileRoute("/$role/$module")({
  beforeLoad: ({ params }) => {
    if (!allowedModules[params.role as Role]?.includes(params.module)) throw notFound();
  },
  component: ModuleRoute,
});

const customerTitles: Record<string, string> = { subscriptions: "My Subscriptions", invoices: "My Invoices", payments: "Payment History" };

function ModuleRoute() {
  const { role, module } = Route.useParams();
  if (module === "reports") return <ReportsPage />;
  if (module === "settings") return <SettingsPage />;
  if (module === "profile") return <ProfilePage />;
  if (role === "customer") {
    if (module === "plans") return <AvailablePlans />;
    return <ModulePage key={module} config={modules[module]!} readOnly titleOverride={customerTitles[module]}
      filter={(r) => r["customer"] === CURRENT_CUSTOMER || (module === "subscriptions" && r["customer"] === "Hooli Cloud")} />;
  }
  return <ModulePage key={module} config={modules[module]!} />;
}
