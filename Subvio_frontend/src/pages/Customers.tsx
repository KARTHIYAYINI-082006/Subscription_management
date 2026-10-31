import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Repeat } from 'lucide-react';
import { CrudPage } from '@/components/CrudPage';
import { NameCell } from '@/components/common';
import { formatDate } from '@/lib/utils';
import type { User } from '@/types';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Name is required'),
    email: z.string().trim().email('Enter a valid email address'),
    gstin: z.string().trim().regex(/^$|^[0-9A-Za-z]{15}$/, 'GSTIN must be 15 letters/digits'),
  })
  .passthrough();

export default function CustomersPage() {
  const navigate = useNavigate();
  return (
    <CrudPage<User>
      resource="customers"
      title="Customers"
      singular="Customer"
      description="Businesses subscribed to your products. New customers receive an email to set their portal password."
      searchPlaceholder="Search name, email, company…"
      canWrite
      columns={[
        { header: 'Customer', cell: (r) => <NameCell title={r.name} subtitle={r.email} /> },
        { header: 'Company', cell: (r) => r.company ?? '—', className: 'hidden md:table-cell' },
        { header: 'Phone', cell: (r) => r.phone ?? '—', className: 'hidden lg:table-cell' },
        { header: 'GSTIN', cell: (r) => <span className="font-mono text-xs">{r.gstin ?? '—'}</span>, className: 'hidden xl:table-cell' },
        { header: 'Subscriptions', cell: (r) => r._count?.subscriptions ?? 0, align: 'right' },
        { header: 'Joined', cell: (r) => formatDate(r.createdAt), className: 'hidden sm:table-cell' },
      ]}
      fields={[
        { name: 'name', label: 'Full name', placeholder: 'Aarav Sharma' },
        { name: 'email', label: 'Email', type: 'email', placeholder: 'aarav@company.in' },
        { name: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
        { name: 'company', label: 'Company', placeholder: 'Sharma Textiles' },
        { name: 'gstin', label: 'GSTIN', placeholder: '08ABCDE1234F1Z5', hint: '15-character GST number (optional)' },
        { name: 'address', label: 'Billing address', type: 'textarea', full: true },
      ]}
      schema={schema}
      defaults={{ name: '', email: '', phone: '', company: '', gstin: '', address: '' }}
      rowActions={(r) => [{ label: 'View subscriptions', icon: <Repeat />, onSelect: () => navigate(`/subscriptions?search=${encodeURIComponent(r.email)}`) }]}
    />
  );
}
