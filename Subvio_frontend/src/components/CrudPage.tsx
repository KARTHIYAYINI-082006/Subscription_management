import { useState } from 'react';
import type { ZodTypeAny } from 'zod';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Dropdown, type MenuAction } from '@/components/ui/dropdown';
import { DataTable, type Column } from '@/components/DataTable';
import { EmptyState, PageHeader, PageTransition, Toolbar } from '@/components/common';
import { ResourceForm, type FieldDef, type FormValues } from '@/components/ResourceForm';
import { useConfirm } from '@/components/ConfirmProvider';
import { useAction, useList, useTableState } from '@/hooks/useResource';
import { api } from '@/lib/api';

interface CrudPageProps<T> {
  resource: string;
  title: string;
  description: string;
  singular: string;
  columns: Column<T>[];
  fields: FieldDef[] | ((editing: T | null) => FieldDef[]);
  schema: ZodTypeAny | ((editing: T | null) => ZodTypeAny);
  defaults: FormValues;
  toForm?: (row: T) => FormValues;
  toPayload?: (values: FormValues) => unknown;
  canWrite: boolean;
  canDelete?: boolean;
  searchPlaceholder?: string;
  rowActions?: (row: T) => MenuAction[];
  dialogSize?: 'sm' | 'md' | 'lg';
}

/** Maps a record onto form defaults: nulls become '', ISO dates become yyyy-mm-dd. */
function defaultToForm(row: Record<string, unknown>, defaults: FormValues) {
  return Object.fromEntries(
    Object.keys(defaults).map((key) => {
      const v = row[key];
      if (v === null || v === undefined) return [key, defaults[key]];
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return [key, v.slice(0, 10)];
      return [key, v];
    }),
  );
}

export function CrudPage<T extends { id: string }>(props: CrudPageProps<T>) {
  const { resource, singular, canWrite, canDelete = canWrite } = props;
  const table = useTableState();
  const query = useList<T>(resource, table.params);
  const confirm = useConfirm();
  const [editing, setEditing] = useState<T | null>(null);
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const openForm = (row: T | null) => {
    setEditing(row);
    setOpen(true);
  };

  const save = useAction(
    (values: FormValues) => {
      const payload = props.toPayload ? props.toPayload(values) : values;
      return editing ? api.put(`/${resource}/${editing.id}`, payload) : api.post(`/${resource}`, payload);
    },
    { success: `${singular} ${editing ? 'updated' : 'created'}`, invalidate: [resource], onSuccess: close },
  );
  const remove = useAction((id: string) => api.delete(`/${resource}/${id}`), { success: `${singular} deleted`, invalidate: [resource] });

  const fields = typeof props.fields === 'function' ? props.fields(editing) : props.fields;
  const schema = typeof props.schema === 'function' ? props.schema(editing) : props.schema;
  const formId = `${resource}-form`;

  const actionsColumn: Column<T> = {
    header: '',
    className: 'w-10',
    cell: (row) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown
          trigger={
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
              <MoreHorizontal />
            </Button>
          }
          items={[
            ...(props.rowActions?.(row) ?? []),
            { label: 'Edit', icon: <Pencil />, onSelect: () => openForm(row), hidden: !canWrite },
            {
              label: 'Delete',
              icon: <Trash2 />,
              danger: true,
              hidden: !canDelete,
              onSelect: async () => {
                if (await confirm({ title: `Delete ${singular.toLowerCase()}?`, description: 'This action cannot be undone.', confirmLabel: 'Delete', danger: true })) {
                  remove.mutate(row.id);
                }
              },
            },
          ]}
        />
      </div>
    ),
  };
  const hasActions = canWrite || canDelete || Boolean(props.rowActions);

  return (
    <PageTransition>
      <PageHeader
        title={props.title}
        description={props.description}
        actions={
          canWrite && (
            <Button onClick={() => openForm(null)}>
              <Plus /> New {singular.toLowerCase()}
            </Button>
          )
        }
      />
      <Card>
        <Toolbar search={table.search} onSearch={table.setSearch} placeholder={props.searchPlaceholder} />
        <DataTable
          columns={hasActions ? [...props.columns, actionsColumn] : props.columns}
          rows={query.data?.data}
          loading={query.isLoading}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={canWrite ? openForm : undefined}
          pagination={{ page: table.page, pageSize: table.params.pageSize, total: query.data?.total ?? 0, onPage: table.setPage }}
          empty={
            <EmptyState
              title={table.params.search ? 'No matches found' : `No ${props.title.toLowerCase()} yet`}
              message={table.params.search ? 'Try a different search term.' : undefined}
              action={canWrite && !table.params.search && <Button onClick={() => openForm(null)}>Create {singular.toLowerCase()}</Button>}
            />
          }
        />
      </Card>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`${editing ? 'Edit' : 'New'} ${singular.toLowerCase()}`}
        size={props.dialogSize}
        footer={
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form={formId} loading={save.isPending}>
              {editing ? 'Save changes' : `Create ${singular.toLowerCase()}`}
            </Button>
          </>
        }
      >
        <ResourceForm
          key={editing?.id ?? 'new'}
          id={formId}
          fields={fields}
          schema={schema}
          defaultValues={editing ? (props.toForm?.(editing) ?? defaultToForm(editing as Record<string, unknown>, props.defaults)) : props.defaults}
          onSubmit={(values) => save.mutate(values)}
        />
      </Dialog>
    </PageTransition>
  );
}
