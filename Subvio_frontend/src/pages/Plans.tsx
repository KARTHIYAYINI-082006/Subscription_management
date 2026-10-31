import { z } from 'zod';
import { CrudPage } from '@/components/CrudPage';
import { NameCell } from '@/components/common';
import { Badge } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { BILLING_PERIODS, periodUnit } from '@/lib/constants';
import { formatDate, inr, titleCase } from '@/lib/utils';
import type { Plan } from '@/types';

const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    price: z.coerce.number().min(0, 'Cannot be negative'),
    billingPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], { message: 'Select a billing period' }),
    minQuantity: z.coerce.number().int('Whole number only').min(1, 'At least 1'),
    startDate: z.string(),
    endDate: z.string(),
  })
  .passthrough()
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { message: 'End date must be after the start date', path: ['endDate'] });

function rules(p: Plan) {
  return [p.autoClose && 'Auto-close', p.closable && 'Early close', p.pausable && 'Pausable', p.renewable && 'Renewable'].filter(Boolean) as string[];
}

export default function PlansPage() {
  const { isAdmin } = useAuth();
  return (
    <CrudPage<Plan>
      resource="plans"
      title="Plans"
      singular="Plan"
      description="Billing frequency, pricing and lifecycle rules for each subscription plan."
      searchPlaceholder="Search plans…"
      canWrite={isAdmin}
      columns={[
        { header: 'Plan', cell: (r) => <NameCell title={r.name} subtitle={r.description} /> },
        { header: 'Plan fee', cell: (r) => `${inr(r.price)} / ${periodUnit(r.billingPeriod)}`, align: 'right' },
        { header: 'Billing', cell: (r) => <Badge tone="violet">{titleCase(r.billingPeriod)}</Badge>, className: 'hidden sm:table-cell' },
        { header: 'Min qty', cell: (r) => r.minQuantity, align: 'right', className: 'hidden md:table-cell' },
        {
          header: 'Available',
          className: 'hidden lg:table-cell',
          cell: (r) => (r.startDate || r.endDate ? `${formatDate(r.startDate)} – ${formatDate(r.endDate)}` : 'Always'),
        },
        {
          header: 'Rules',
          className: 'hidden xl:table-cell',
          cell: (r) => (
            <div className="flex gap-1">
              {rules(r).map((x) => (
                <Badge key={x}>{x}</Badge>
              ))}
            </div>
          ),
        },
        { header: 'Subs', cell: (r) => r._count?.subscriptions ?? 0, align: 'right' },
      ]}
      fields={[
        { name: 'name', label: 'Plan name', placeholder: 'Business Monthly' },
        { name: 'billingPeriod', label: 'Billing period', type: 'select', options: BILLING_PERIODS },
        { name: 'price', label: 'Plan fee (₹)', type: 'number', hint: 'Fixed fee per billing period, added to product lines (0 for none)' },
        { name: 'minQuantity', label: 'Minimum quantity', type: 'number', step: '1', hint: 'Minimum quantity for each product line' },
        { name: 'startDate', label: 'Available from', type: 'date' },
        { name: 'endDate', label: 'Available until', type: 'date' },
        { name: 'autoClose', label: 'Close automatically at expiry', type: 'checkbox' },
        { name: 'closable', label: 'Allow early closure', type: 'checkbox' },
        { name: 'pausable', label: 'Allow pausing', type: 'checkbox' },
        { name: 'renewable', label: 'Allow renewal', type: 'checkbox' },
        { name: 'description', label: 'Description', type: 'textarea', full: true },
      ]}
      schema={schema}
      defaults={{ name: '', price: 0, billingPeriod: 'MONTHLY', minQuantity: 1, startDate: '', endDate: '', autoClose: false, closable: true, pausable: true, renewable: true, description: '' }}
    />
  );
}
