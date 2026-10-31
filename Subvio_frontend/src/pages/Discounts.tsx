import { z } from 'zod';
import { CrudPage } from '@/components/CrudPage';
import { NameCell } from '@/components/common';
import { Badge } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useOptions } from '@/hooks/useResource';
import { formatDate, inputDate, inr } from '@/lib/utils';
import type { Discount, Product } from '@/types';

const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    type: z.enum(['FIXED', 'PERCENTAGE']),
    value: z.coerce.number().positive('Must be greater than 0'),
    scope: z.enum(['SUBSCRIPTION', 'PRODUCTS']),
    productIds: z.array(z.string()),
    startDate: z.string(),
    endDate: z.string(),
  })
  .passthrough()
  .refine((v) => v.type !== 'PERCENTAGE' || v.value <= 100, { message: 'Cannot exceed 100%', path: ['value'] })
  .refine((v) => v.scope !== 'PRODUCTS' || v.productIds.length > 0, { message: 'Select at least one product', path: ['productIds'] })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { message: 'End date must be after the start date', path: ['endDate'] });

function discountState(d: Discount): { label: string; tone: 'green' | 'gray' | 'red' | 'amber' } {
  const today = inputDate();
  if (!d.isActive) return { label: 'Inactive', tone: 'gray' };
  if (d.endDate && d.endDate.slice(0, 10) < today) return { label: 'Expired', tone: 'red' };
  if (d.usageLimit !== null && d.usedCount >= d.usageLimit) return { label: 'Used up', tone: 'red' };
  if (d.startDate && d.startDate.slice(0, 10) > today) return { label: 'Scheduled', tone: 'amber' };
  return { label: 'Active', tone: 'green' };
}

export default function DiscountsPage() {
  const { isAdmin } = useAuth();
  const products = useOptions<Product>('products');

  return (
    <CrudPage<Discount>
      resource="discounts"
      title="Discounts"
      singular="Discount"
      description="Eligible discounts are applied automatically to the next invoice — the best one wins."
      searchPlaceholder="Search discounts…"
      canWrite={isAdmin}
      dialogSize="lg"
      columns={[
        {
          header: 'Discount',
          cell: (r) => <NameCell title={r.name} subtitle={r.scope === 'PRODUCTS' ? `On ${r.products.map((p) => p.name).join(', ')}` : 'Whole subscription'} />,
        },
        { header: 'Value', cell: (r) => (r.type === 'PERCENTAGE' ? `${r.value}%` : inr(r.value)), align: 'right' },
        {
          header: 'Conditions',
          className: 'hidden md:table-cell',
          cell: (r) => [r.minPurchase > 0 && `Min ${inr(r.minPurchase)}`, r.minQuantity > 0 && `Min ${r.minQuantity} qty`, r.maxDiscount && `Max ${inr(r.maxDiscount)}`].filter(Boolean).join(' · ') || 'None',
        },
        { header: 'Validity', className: 'hidden lg:table-cell', cell: (r) => (r.startDate || r.endDate ? `${formatDate(r.startDate)} – ${formatDate(r.endDate)}` : 'No end date') },
        { header: 'Used', cell: (r) => `${r.usedCount}${r.usageLimit !== null ? ` / ${r.usageLimit}` : ''}`, align: 'right', className: 'hidden sm:table-cell' },
        { header: 'Status', cell: (r) => <Badge tone={discountState(r).tone}>{discountState(r).label}</Badge> },
      ]}
      fields={[
        { name: 'name', label: 'Discount name', placeholder: 'Volume 10+ seats', full: true },
        { name: 'type', label: 'Type', type: 'select', options: [{ value: 'PERCENTAGE', label: 'Percentage' }, { value: 'FIXED', label: 'Fixed amount' }] },
        { name: 'value', label: 'Value', type: 'number', hint: 'Percent or ₹ amount' },
        { name: 'scope', label: 'Applies to', type: 'select', options: [{ value: 'SUBSCRIPTION', label: 'Whole subscription' }, { value: 'PRODUCTS', label: 'Specific products' }], full: true },
        { name: 'productIds', label: 'Products', type: 'multiselect', options: products.map((p) => ({ value: p.id, label: p.name })), full: true, showIf: (v) => v.scope === 'PRODUCTS' },
        { name: 'minPurchase', label: 'Minimum purchase (₹)', type: 'number' },
        { name: 'minQuantity', label: 'Minimum quantity', type: 'number', step: '1' },
        { name: 'maxDiscount', label: 'Maximum discount (₹)', type: 'number', hint: 'Leave empty for no cap', showIf: (v) => v.type === 'PERCENTAGE' },
        { name: 'usageLimit', label: 'Usage limit', type: 'number', step: '1', hint: 'Number of invoices; empty for unlimited' },
        { name: 'startDate', label: 'Start date', type: 'date' },
        { name: 'endDate', label: 'End date', type: 'date' },
        { name: 'isActive', label: 'Discount is active', type: 'checkbox', full: true },
      ]}
      schema={schema}
      defaults={{ name: '', type: 'PERCENTAGE', value: '', scope: 'SUBSCRIPTION', productIds: [], minPurchase: 0, minQuantity: 0, maxDiscount: '', usageLimit: '', startDate: '', endDate: '', isActive: true }}
      toForm={(r) => ({
        name: r.name,
        type: r.type,
        value: r.value,
        scope: r.scope,
        productIds: r.products.map((p) => p.id),
        minPurchase: r.minPurchase,
        minQuantity: r.minQuantity,
        maxDiscount: r.maxDiscount ?? '',
        usageLimit: r.usageLimit ?? '',
        startDate: r.startDate?.slice(0, 10) ?? '',
        endDate: r.endDate?.slice(0, 10) ?? '',
        isActive: r.isActive,
      })}
      toPayload={(v) => (v.type === 'FIXED' ? { ...v, maxDiscount: '' } : v)}
    />
  );
}
