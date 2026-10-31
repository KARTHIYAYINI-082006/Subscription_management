import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = Record<string, unknown>;
export type Column<_T = Row> = { key: string; label: string; render?: ((row: Row) => ReactNode) | undefined; align?: "right" | undefined };

export function DataTable({ rows, columns, searchable = true, statusKey = "status", actions, compact }: {
  rows: Row[]; columns: Column[]; searchable?: boolean; statusKey?: string; actions?: (row: Row) => ReactNode; compact?: boolean;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => String(r[statusKey] ?? "")).filter(Boolean))), [rows, statusKey]);
  const filtered = rows.filter((r) =>
    (status === "all" || r[statusKey] === status) &&
    (!q || Object.values(r).some((v) => String(v).toLowerCase().includes(q.toLowerCase()))),
  );
  return (
    <div>
      {searchable && (
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
          </div>
          {statuses.length > 0 && (
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => <th key={c.key} className={`whitespace-nowrap px-4 py-3 font-semibold ${c.align === "right" ? "text-right" : ""}`}>{c.label}</th>)}
              {actions && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((r, i) => (
              <tr key={i} className="bg-card transition-colors hover:bg-muted/40">
                {columns.map((c) => (
                  <td key={c.key} className={`whitespace-nowrap px-4 ${compact ? "py-2.5" : "py-3"} ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                    {c.render ? c.render(r) : String(r[c.key] ?? "")}
                  </td>
                ))}
                {actions && <td className="px-4 py-2 text-right">{actions(r)}</td>}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-4 py-10 text-center text-muted-foreground">No records match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {searchable && <p className="mt-3 text-xs text-muted-foreground">Showing {filtered.length} of {rows.length}</p>}
    </div>
  );
}
