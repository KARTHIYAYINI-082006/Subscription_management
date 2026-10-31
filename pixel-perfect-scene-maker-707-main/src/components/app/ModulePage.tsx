import { useState } from "react";
import { Eye, Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "./DataTable";
import { PageHeader } from "./StatCard";
import type { ModuleConfig } from "./modules";

type Row = Record<string, unknown>;

export function ModulePage({ config, readOnly, filter, titleOverride }: { config: ModuleConfig; readOnly?: boolean; filter?: (r: Row) => boolean; titleOverride?: string | undefined }) {
  const [rows, setRows] = useState<Row[]>(() => (filter ? config.data.filter(filter) : config.data));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing = config.fields.find((f) => !form[f.name]);
    if (missing) { toast.error(`${missing.label} is required`); return; }
    const prefix = String(config.data[0]?.["id"] ?? "NEW").split("-")[0];
    const row: Row = { id: `${prefix}-${Math.floor(Math.random() * 9000 + 1000)}`, status: "Active", ...form };
    for (const f of config.fields) if (f.type === "number") row[f.name] = Number(form[f.name]);
    setRows([row, ...rows]);
    setForm({});
    setOpen(false);
    toast.success(`${config.singular} created`);
  };

  return (
    <div>
      <PageHeader
        title={titleOverride ?? config.title}
        subtitle={config.subtitle}
        actions={<>
          <Button variant="outline" onClick={() => toast.success("Export started — CSV will download shortly")}><Download className="size-4" />Export</Button>
          {!readOnly && <Button onClick={() => setOpen(true)}><Plus className="size-4" />New {config.singular.toLowerCase()}</Button>}
        </>}
      />
      <div className="rounded-xl border bg-card p-5 shadow-card">
        <DataTable
          rows={rows}
          columns={config.columns}
          actions={(r) => (
            <div className="flex justify-end gap-1">
              <Button size="icon" variant="ghost" aria-label="View" onClick={() => setView(r)}><Eye className="size-4" /></Button>
              {!readOnly && (
                <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => { setRows(rows.filter((x) => x !== r)); toast.success(`${config.singular} removed`); }}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            </div>
          )}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New {config.singular.toLowerCase()}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {config.fields.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={f.name}>{f.label}</Label>
                {f.options ? (
                  <Select value={form[f.name] ?? ""} onValueChange={(v) => setForm({ ...form, [f.name]: v })}>
                    <SelectTrigger id={f.name}><SelectValue placeholder={`Select ${f.label.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>{f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input id={f.name} type={f.type ?? "text"} value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                )}
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{config.singular} details</DialogTitle></DialogHeader>
          <dl className="divide-y rounded-lg border">
            {view && Object.entries(view).filter(([, v]) => !Array.isArray(v)).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                <dt className="capitalize text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</dt>
                <dd className="text-right font-medium">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}
