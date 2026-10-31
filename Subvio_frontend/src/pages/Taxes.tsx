import { z } from 'zod';
import { CrudPage } from '@/components/CrudPage';
import { useAuth } from '@/context/AuthContext';
import type { Tax } from '@/types';

export default function TaxesPage() {
  const { isAdmin } = useAuth();
  return (
    <CrudPage<Tax>
      resource="taxes"
      title="Taxes"
      singular="Tax"
      description="Tax rules applied automatically to invoice lines through each product's default taxes."
      searchPlaceholder="Search taxes…"
      canWrite={isAdmin}
      dialogSize="sm"
      columns={[
        { header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> },
        { header: 'Rate', cell: (r) => `${r.rate}%`, align: 'right' },
        { header: 'Description', cell: (r) => r.description ?? '—', className: 'hidden sm:table-cell' },
      ]}
      fields={[
        { name: 'name', label: 'Name', placeholder: 'CGST 9%', full: true },
        { name: 'rate', label: 'Rate (%)', type: 'number', full: true },
        { name: 'description', label: 'Description', type: 'textarea', full: true },
      ]}
      schema={z
        .object({ name: z.string().trim().min(1, 'Name is required'), rate: z.coerce.number().min(0, 'Min 0').max(100, 'Max 100') })
        .passthrough()}
      defaults={{ name: '', rate: 0, description: '' }}
    />
  );
}
