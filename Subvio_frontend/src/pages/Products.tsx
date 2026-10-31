import { z } from 'zod';
import { CrudPage } from '@/components/CrudPage';
import { NameCell } from '@/components/common';
import { Badge } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useOptions } from '@/hooks/useResource';
import { inr, titleCase } from '@/lib/utils';
import type { Product, Tax } from '@/types';

const money = z.coerce.number({ invalid_type_error: 'Enter an amount' }).min(0, 'Cannot be negative');
const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    type: z.enum(['SERVICE', 'GOODS']),
    salesPrice: money,
    costPrice: money,
    variants: z.array(
      z.object({ id: z.string().optional(), attribute: z.string().trim().min(1, 'Required'), value: z.string().trim().min(1, 'Required'), extraPrice: money }),
    ),
  })
  .passthrough();

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const taxes = useOptions<Tax>('taxes');

  return (
    <CrudPage<Product>
      resource="products"
      title="Products"
      singular="Product"
      description="Software, add-ons and goods you sell on subscription, with variants and default taxes."
      searchPlaceholder="Search products…"
      canWrite={isAdmin}
      dialogSize="lg"
      columns={[
        { header: 'Product', cell: (r) => <NameCell title={r.name} subtitle={r.description} /> },
        { header: 'Type', cell: (r) => <Badge tone={r.type === 'SERVICE' ? 'violet' : 'blue'}>{titleCase(r.type)}</Badge>, className: 'hidden sm:table-cell' },
        { header: 'Sales price', cell: (r) => inr(r.salesPrice), align: 'right' },
        { header: 'Cost price', cell: (r) => inr(r.costPrice), align: 'right', className: 'hidden md:table-cell' },
        {
          header: 'Variants',
          className: 'hidden lg:table-cell',
          cell: (r) => (r.variants.length ? r.variants.map((v) => `${v.value}${v.extraPrice ? ` (+${inr(v.extraPrice)})` : ''}`).join(', ') : '—'),
        },
        { header: 'Taxes', cell: (r) => r.taxes.map((t) => t.name).join(' + ') || '—', className: 'hidden xl:table-cell' },
      ]}
      fields={[
        { name: 'name', label: 'Product name', placeholder: 'Brightloop CRM' },
        { name: 'type', label: 'Type', type: 'select', options: [{ value: 'SERVICE', label: 'Service' }, { value: 'GOODS', label: 'Goods' }] },
        { name: 'salesPrice', label: 'Sales price (₹)', type: 'number', hint: 'Monthly list price per unit' },
        { name: 'costPrice', label: 'Cost price (₹)', type: 'number' },
        { name: 'taxIds', label: 'Taxes applied', type: 'multiselect', options: taxes.map((t) => ({ value: t.id, label: `${t.name}` })), full: true },
        { name: 'description', label: 'Notes', type: 'textarea', full: true },
        {
          name: 'variants',
          label: 'Variants',
          type: 'list',
          addLabel: 'Add variant',
          emptyRow: { attribute: '', value: '', extraPrice: 0 },
          fields: [
            { name: 'attribute', label: 'Attribute', placeholder: 'Brand' },
            { name: 'value', label: 'Value', placeholder: 'Odoo' },
            { name: 'extraPrice', label: 'Extra price (₹)', type: 'number' },
          ],
        },
      ]}
      schema={schema}
      defaults={{ name: '', type: 'SERVICE', salesPrice: 0, costPrice: 0, description: '', taxIds: [], variants: [] }}
      toForm={(r) => ({
        name: r.name,
        type: r.type,
        salesPrice: r.salesPrice,
        costPrice: r.costPrice,
        description: r.description ?? '',
        taxIds: r.taxes.map((t) => t.id),
        variants: r.variants.map(({ id, attribute, value, extraPrice }) => ({ id, attribute, value, extraPrice })),
      })}
    />
  );
}
