import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { FilePlus2 } from 'lucide-react';
import { CrudPage } from '@/components/CrudPage';
import { NameCell } from '@/components/common';
import { useOptions } from '@/hooks/useResource';
import type { Plan, Product, QuotationTemplate } from '@/types';

const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    planId: z.string().min(1, 'Select a plan'),
    validityDays: z.coerce.number().int().min(1, 'At least 1 day').max(365, 'Max 365 days'),
    lines: z
      .array(z.object({ productId: z.string().min(1, 'Select a product'), quantity: z.coerce.number().int().min(1, 'Min 1') }))
      .min(1, 'Add at least one product line'),
  })
  .passthrough();

export default function TemplatesPage() {
  const navigate = useNavigate();
  const plans = useOptions<Plan>('plans');
  const products = useOptions<Product>('products');

  return (
    <CrudPage<QuotationTemplate>
      resource="templates"
      title="Quotation templates"
      singular="Template"
      description="Reusable starting points with a plan, product lines and a validity period."
      searchPlaceholder="Search templates…"
      canWrite
      dialogSize="lg"
      columns={[
        { header: 'Template', cell: (r) => <NameCell title={r.name} subtitle={r.notes} /> },
        { header: 'Plan', cell: (r) => r.plan.name },
        { header: 'Products', className: 'hidden md:table-cell', cell: (r) => <span className="text-ink-muted">{r.lines.map((l) => `${l.product.name} × ${l.quantity}`).join(', ')}</span> },
        { header: 'Valid for', cell: (r) => `${r.validityDays} days`, align: 'right' },
      ]}
      rowActions={(r) => [{ label: 'Create quotation', icon: <FilePlus2 />, onSelect: () => navigate(`/subscriptions/new?template=${r.id}`) }]}
      fields={[
        { name: 'name', label: 'Template name', placeholder: 'Growth Bundle' },
        { name: 'planId', label: 'Plan', type: 'select', options: plans.map((p) => ({ value: p.id, label: p.name })) },
        { name: 'validityDays', label: 'Quotation valid for (days)', type: 'number', step: '1' },
        { name: 'notes', label: 'Notes', type: 'textarea', full: true },
        {
          name: 'lines',
          label: 'Product lines',
          type: 'list',
          addLabel: 'Add product',
          emptyRow: { productId: '', quantity: 1 },
          fields: [
            { name: 'productId', label: 'Product', type: 'select', options: products.map((p) => ({ value: p.id, label: p.name })) },
            { name: 'quantity', label: 'Quantity', type: 'number', step: '1' },
          ],
        },
      ]}
      schema={schema}
      defaults={{ name: '', planId: '', validityDays: 30, notes: '', lines: [{ productId: '', quantity: 1 }] }}
      toForm={(r) => ({ name: r.name, planId: r.planId, validityDays: r.validityDays, notes: r.notes ?? '', lines: r.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })) })}
    />
  );
}
