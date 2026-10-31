import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard, CustomerDashboard, StaffDashboard } from "@/components/app/Dashboards";

export const Route = createFileRoute("/$role/")({ component: Overview });

function Overview() {
  const { role } = Route.useParams();
  if (role === "admin") return <AdminDashboard />;
  if (role === "staff") return <StaffDashboard />;
  return <CustomerDashboard />;
}
