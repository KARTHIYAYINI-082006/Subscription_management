import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  success: "bg-success/12 text-success ring-success/25",
  warning: "bg-warning/15 text-warning-foreground ring-warning/30",
  danger: "bg-destructive/10 text-destructive ring-destructive/25",
  info: "bg-accent text-accent-foreground ring-primary/20",
  muted: "bg-muted text-muted-foreground ring-border",
};
const map: Record<string, keyof typeof tone> = {
  Active: "success", Paid: "success", Succeeded: "success", Accepted: "success",
  Pending: "warning", Trial: "info", Sent: "info", Invited: "info", Paused: "warning",
  Overdue: "danger", Failed: "danger", Rejected: "danger", Cancelled: "danger", Expired: "danger",
  Draft: "muted", Inactive: "muted", Archived: "muted", Refunded: "muted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tone[map[status] ?? "muted"])}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
