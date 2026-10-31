import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, Skeleton } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { PageHeader, PageTransition } from '@/components/common';
import { useAction, useItem, useOptions } from '@/hooks/useResource';
import { api } from '@/lib/api';
import { PAYMENT_TERMS, PERIOD_PRICE_FACTOR, periodUnit } from '@/lib/constants';
import { inputDate, inr, toInputDate } from '@/lib/utils';
import type { Plan, Product, QuotationTemplate, Subscription, SubscriptionDetail, User } from '@/types';

const schema = z
  .object({
    customerId: z.string().min(1, 'Select a customer'),
    planId: z.string().min(1, 'Select a plan'),
    startDate: z.string().min(1, 'Start date is required'),
    expiryDate: z.string(),
    quotationValidUntil: z.string(),
    paymentTermDays: z.string(),
    notes: z.string(),
    lines: z
      .array(
        z.object({
          productId: z.string().min(1, 'Select a product'),
          variantId: z.string(),
          quantity: z.coerce.number().int('Whole number').min(1, 'Min 1'),
          unitPrice: z.coerce.number().min(0, 'Invalid'),
        }),
      )
      .min(1, 'Add at least one product line'),
  })
  .refine((v) => !v.expiryDate || v.expiryDate > v.startDate, { message: 'Expiry must be after the start date', path: ['expiryDate'] });

type FormValues = z.infer<typeof schema>;
const emptyLine = { productId: '', variantId: '', quantity: 1, unitPrice: 0 };
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function SubscriptionForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const existing = useItem<SubscriptionDetail>('subscriptions', id);
  const template = useItem<QuotationTemplate>('templates', id ? undefined : (params.get('template') ?? undefined));

  if ((id && !existing.data) || (params.get('template') && !id && !template.data && !template.error)) {
    return <Skeleton className="h-96 w-full" />;
  }
  return <SubscriptionFormInner key={id ?? 'new'} existing={existing.data} template={template.data} />;
}

function SubscriptionFormInner({ existing, template }: { existing?: SubscriptionDetail; template?: QuotationTemplate }) {
  const navigate = useNavigate();
  const customers = useOptions<User>('customers');
  const plans = useOptions<Plan>('plans');
  const products = useOptions<Product>('products');
  const templates = useOptions<QuotationTemplate>('templates', !existing);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);

  const defaults: FormValues = existing
    ? {
        customerId: existing.customerId,
        planId: existing.planId,
        startDate: toInputDate(existing.startDate),
        expiryDate: toInputDate(existing.expiryDate),
        quotationValidUntil: toInputDate(existing.quotationValidUntil),
        paymentTermDays: String(existing.paymentTermDays),
        notes: existing.notes ?? '',
        lines: existing.lines.map((l) => ({ productId: l.productId, variantId: l.variantId ?? '', quantity: l.quantity, unitPrice: l.unitPrice })),
      }
    : {
        customerId: '',
        planId: template?.planId ?? '',
        startDate: inputDate(),
        expiryDate: '',
        quotationValidUntil: inputDate(template?.validityDays ?? 30),
        paymentTermDays: '15',
        notes: template?.notes ?? '',
        lines: template
          ? template.lines.map((l) => ({
              productId: l.productId,
              variantId: '',
              quantity: l.quantity,
              unitPrice: round2(l.product.salesPrice * PERIOD_PRICE_FACTOR[template.plan.billingPeriod]),
            }))
          : [emptyLine],
      };

  const { register, control, handleSubmit, watch, setValue, getValues, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaults,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const { errors } = formState;

  const plan = planMap.get(watch('planId'));
  const lines = watch('lines');

  const suggestedPrice = (productId: string, variantId: string, planId = getValues('planId')) => {
    const product = productMap.get(productId);
    if (!product) return 0;
    const extra = product.variants.find((v) => v.id === variantId)?.extraPrice ?? 0;
    const period = planMap.get(planId)?.billingPeriod ?? 'MONTHLY';
    return round2((product.salesPrice + extra) * PERIOD_PRICE_FACTOR[period]);
  };

  const applyTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    reset({
      ...getValues(),
      planId: t.planId,
      quotationValidUntil: inputDate(t.validityDays),
      notes: t.notes ?? getValues('notes'),
      lines: t.lines.map((l) => ({ productId: l.productId, variantId: '', quantity: l.quantity, unitPrice: suggestedPrice(l.productId, '', t.planId) })),
    });
  };

  const onPlanChange = (planId: string) =>
    getValues('lines').forEach((l, i) => l.productId && setValue(`lines.${i}.unitPrice`, suggestedPrice(l.productId, l.variantId, planId)));

  const lineTotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const subtotal = lineTotal + (plan?.price ?? 0);

  const save = useAction(
    (values: FormValues) =>
      existing ? api.put<Subscription>(`/subscriptions/${existing.id}`, values) : api.post<Subscription>('/subscriptions', values),
    {
      success: existing ? 'Subscription updated' : 'Subscription created as draft',
      invalidate: ['subscriptions'],
      onSuccess: (sub) => navigate(`/subscriptions/${sub.id}`, { replace: true }),
    },
  );

  return (
    <PageTransition>
      <PageHeader
        back={existing ? `/subscriptions/${existing.id}` : '/subscriptions'}
        title={existing ? `Edit ${existing.number}` : 'New subscription'}
        description="Lines are priced per billing period. Taxes and eligible discounts are applied automatically on invoices."
      />
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Details" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {!existing && (
                <Field label="Start from template" hint="Prefills the plan, product lines and quotation validity" className="sm:col-span-2">
                  <Select defaultValue={template?.id ?? ''} onChange={(e) => applyTemplate(e.target.value)}>
                    <option value="">No template</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Customer" error={errors.customerId?.message}>
                <Select {...register('customerId')} aria-invalid={Boolean(errors.customerId)}>
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` — ${c.company}` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Plan"
                error={errors.planId?.message}
                hint={plan ? `${plan.billingPeriod.toLowerCase()} · fee ${inr(plan.price)} · min qty ${plan.minQuantity}` : undefined}
              >
                <Select {...register('planId', { onChange: (e) => onPlanChange(e.target.value) })} aria-invalid={Boolean(errors.planId)}>
                  <option value="">Select plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Start date" error={errors.startDate?.message}>
                <Input type="date" {...register('startDate')} />
              </Field>
              <Field label="Expiry date" error={errors.expiryDate?.message} hint="Leave empty for an open-ended subscription">
                <Input type="date" {...register('expiryDate')} />
              </Field>
              <Field label="Quotation valid until">
                <Input type="date" {...register('quotationValidUntil')} />
              </Field>
              <Field label="Payment terms">
                <Select {...register('paymentTermDays')}>
                  {PAYMENT_TERMS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Product lines"
              description={plan ? `Prices per ${periodUnit(plan.billingPeriod)}` : 'Select a plan to suggest prices'}
              action={
                <Button variant="secondary" size="sm" onClick={() => append(emptyLine)}>
                  <Plus /> Add line
                </Button>
              }
            />
            <div className="space-y-3 p-4">
              <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_80px_110px_100px_36px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted md:grid">
                <span>Product</span>
                <span>Variant</span>
                <span>Qty</span>
                <span>Unit price</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              {fields.map((f, i) => {
                const line = lines[i];
                const product = productMap.get(line?.productId);
                const rowErrors = errors.lines?.[i];
                return (
                  <div key={f.id} className="grid grid-cols-2 gap-2 rounded-lg border border-line p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_80px_110px_100px_36px] md:items-start md:border-0 md:p-0">
                    <div className="col-span-2 md:col-span-1">
                      <Select
                        {...register(`lines.${i}.productId`, {
                          onChange: (e) => {
                            setValue(`lines.${i}.variantId`, '');
                            setValue(`lines.${i}.unitPrice`, suggestedPrice(e.target.value, ''));
                          },
                        })}
                        aria-invalid={Boolean(rowErrors?.productId)}
                        aria-label="Product"
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </Select>
                      {rowErrors?.productId && <p className="mt-1 text-xs text-rose-600">{rowErrors.productId.message}</p>}
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <Select
                        {...register(`lines.${i}.variantId`, { onChange: (e) => setValue(`lines.${i}.unitPrice`, suggestedPrice(line.productId, e.target.value)) })}
                        disabled={!product?.variants.length}
                        aria-label="Variant"
                      >
                        <option value="">{product?.variants.length ? 'Standard' : 'No variants'}</option>
                        {product?.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.attribute}: {v.value}
                            {v.extraPrice ? ` (+${inr(v.extraPrice)})` : ''}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <span className="mb-1 block text-[11px] text-ink-muted md:hidden">Quantity</span>
                      <Input type="number" min={1} step={1} {...register(`lines.${i}.quantity`)} aria-invalid={Boolean(rowErrors?.quantity)} aria-label="Quantity" />
                    </div>
                    <div>
                      <span className="mb-1 block text-[11px] text-ink-muted md:hidden">Unit price (₹)</span>
                      <Input type="number" min={0} step="any" {...register(`lines.${i}.unitPrice`)} aria-label="Unit price" />
                    </div>
                    <div className="flex h-9 items-center text-sm font-medium tabular-nums md:justify-end">
                      {inr((Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0))}
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => remove(i)} disabled={fields.length === 1} aria-label="Remove line" className="text-ink-muted hover:text-rose-600">
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {errors.lines?.root?.message && <p className="text-xs text-rose-600">{errors.lines.root.message}</p>}
              {errors.lines?.message && <p className="text-xs text-rose-600">{errors.lines.message}</p>}
            </div>
          </Card>

          <Card className="p-5">
            <Field label="Notes">
              <Textarea placeholder="Internal notes or terms shown on the quotation" {...register('notes')} />
            </Field>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20 p-5">
            <h3 className="font-semibold text-ink">Summary</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-ink-muted">
                <span>Product lines</span>
                <span className="tabular-nums text-ink">{inr(lineTotal)}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Plan fee</span>
                <span className="tabular-nums text-ink">{inr(plan?.price ?? 0)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-2 font-semibold">
                <span>Subtotal{plan ? ` / ${periodUnit(plan.billingPeriod)}` : ''}</span>
                <span className="tabular-nums">{inr(subtotal)}</span>
              </div>
              <p className="text-xs text-ink-muted">Before taxes and automatic discounts.</p>
            </div>
            <Button type="submit" className="mt-5 w-full" loading={save.isPending}>
              {existing ? 'Save changes' : 'Create subscription'}
            </Button>
          </Card>
        </div>
      </form>
    </PageTransition>
  );
}
