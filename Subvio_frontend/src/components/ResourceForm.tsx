/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, useFieldArray, useForm, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodTypeAny } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form';
import { cn } from '@/lib/utils';

export type FormValues = Record<string, any>;
type Option = { value: string; label: string };
type FieldType = 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'date' | 'checkbox' | 'multiselect' | 'list';

export interface FieldDef {
  name: string;
  label: string;
  type?: FieldType;
  options?: Option[];
  placeholder?: string;
  hint?: string;
  /** Span both columns on wider screens. */
  full?: boolean;
  step?: string;
  /** Sub-fields for `list` fields (rendered as repeatable rows). */
  fields?: FieldDef[];
  addLabel?: string;
  emptyRow?: FormValues;
  showIf?: (values: FormValues) => boolean;
}

const errorAt = (errors: FieldErrors, path: string): string | undefined => {
  const err = path.split('.').reduce<any>((acc, key) => acc?.[key], errors);
  return err?.message ?? err?.root?.message;
};

interface ControlProps {
  field: FieldDef;
  name: string;
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors;
  compact?: boolean;
}

function FieldControl({ field, name, register, control, errors, compact }: ControlProps) {
  const error = errorAt(errors, name);
  const common = { 'aria-invalid': Boolean(error), placeholder: field.placeholder };
  const type = field.type ?? 'text';

  if (type === 'checkbox') {
    return <Checkbox label={field.label} {...register(name)} className={cn(field.full && 'sm:col-span-2', 'pt-1')} />;
  }
  if (type === 'list') return <ListField field={field} register={register} control={control} errors={errors} />;

  let input;
  if (type === 'textarea') input = <Textarea {...common} {...register(name)} />;
  else if (type === 'select')
    input = (
      <Select {...common} {...register(name)}>
        <option value="">{field.placeholder ?? `Select ${field.label.toLowerCase()}`}</option>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    );
  else if (type === 'multiselect')
    input = (
      <Controller
        control={control}
        name={name}
        render={({ field: f }) => {
          const selected: string[] = f.value ?? [];
          return (
            <div className="scrollbar-thin grid max-h-40 gap-1.5 overflow-y-auto rounded-lg border border-line p-2.5 sm:grid-cols-2">
              {field.options?.length ? (
                field.options.map((o) => (
                  <Checkbox
                    key={o.value}
                    label={o.label}
                    checked={selected.includes(o.value)}
                    onChange={(e) => f.onChange(e.target.checked ? [...selected, o.value] : selected.filter((v) => v !== o.value))}
                  />
                ))
              ) : (
                <span className="text-xs text-ink-muted">No options available</span>
              )}
            </div>
          );
        }}
      />
    );
  else input = <Input type={type} step={field.step ?? (type === 'number' ? 'any' : undefined)} min={type === 'number' ? 0 : undefined} {...common} {...register(name)} />;

  return (
    <Field label={compact ? undefined : field.label} error={error} hint={compact ? undefined : field.hint} className={cn(field.full && 'sm:col-span-2')}>
      {input}
    </Field>
  );
}

function ListField({ field, register, control, errors }: Omit<ControlProps, 'name'>) {
  const { fields: rows, append, remove } = useFieldArray({ control, name: field.name });
  const subFields = field.fields ?? [];
  const listError = errorAt(errors, field.name);
  const grid = { gridTemplateColumns: subFields.map((s) => (s.type === 'select' ? 'minmax(0,2fr)' : 'minmax(0,1fr)')).join(' ') };
  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink">{field.label}</span>
        <Button variant="ghost" size="sm" onClick={() => append(field.emptyRow ?? {})}>
          <Plus /> {field.addLabel ?? 'Add row'}
        </Button>
      </div>
      {rows.length > 0 && (
        <div className="space-y-2 rounded-lg border border-line bg-cloud/50 p-2.5">
          <div className="flex gap-2 pr-11">
            <div className="grid flex-1 gap-2" style={grid}>
              {subFields.map((s) => (
                <span key={s.name} className="truncate text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          {rows.map((row, i) => (
            <div key={row.id} className="flex items-start gap-2">
              <div className="grid flex-1 gap-2" style={grid}>
                {subFields.map((s) => (
                  <FieldControl key={s.name} field={s} name={`${field.name}.${i}.${s.name}`} register={register} control={control} errors={errors} compact />
                ))}
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove row" className="text-ink-muted hover:text-rose-600">
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
      {listError && <p className="text-xs text-rose-600">{listError}</p>}
    </div>
  );
}

interface ResourceFormProps {
  id: string;
  fields: FieldDef[];
  schema: ZodTypeAny;
  defaultValues: FormValues;
  onSubmit: (values: FormValues) => void;
}

/** Config-driven form used by all catalogue CRUD pages. */
export function ResourceForm({ id, fields, schema, defaultValues, onSubmit }: ResourceFormProps) {
  const { register, control, handleSubmit, watch, formState } = useForm<FormValues>({
    resolver: zodResolver(schema as any) as any,
    defaultValues,
  });
  const values = watch();
  return (
    <form id={id} onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      {fields
        .filter((f) => !f.showIf || f.showIf(values))
        .map((f) => (
          <FieldControl key={f.name} field={f} name={f.name} register={register} control={control} errors={formState.errors} />
        ))}
    </form>
  );
}
