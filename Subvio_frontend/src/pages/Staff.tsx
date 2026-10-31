import { z } from 'zod';
import { CrudPage } from '@/components/CrudPage';
import { NameCell } from '@/components/common';
import { Badge } from '@/components/ui/card';
import type { FieldDef } from '@/components/ResourceForm';
import { strongPassword } from '@/pages/auth/AuthPages';
import { formatDate, titleCase } from '@/lib/utils';
import type { User } from '@/types';

const base = { name: z.string().trim().min(2, 'Name is required'), email: z.string().trim().email('Enter a valid email address') };

export default function StaffPage() {
  return (
    <CrudPage<User>
      resource="staff"
      title="Staff"
      singular="Staff member"
      description="Team members who manage customers, subscriptions and billing. Only admins can add staff."
      searchPlaceholder="Search name or email…"
      canWrite
      canDelete={false}
      columns={[
        { header: 'Member', cell: (r) => <NameCell title={r.name} subtitle={r.email} /> },
        { header: 'Role', cell: (r) => <Badge tone={r.role === 'ADMIN' ? 'ink' : 'violet'}>{titleCase(r.role)}</Badge> },
        { header: 'Phone', cell: (r) => r.phone ?? '—', className: 'hidden md:table-cell' },
        { header: 'Status', cell: (r) => <Badge tone={r.isActive ? 'green' : 'gray'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
        { header: 'Added', cell: (r) => formatDate(r.createdAt), className: 'hidden sm:table-cell' },
      ]}
      fields={(editing) =>
        [
          { name: 'name', label: 'Full name' },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'phone', label: 'Phone' },
          { name: 'role', label: 'Role', type: 'select', options: [{ value: 'STAFF', label: 'Staff' }, { value: 'ADMIN', label: 'Admin' }] },
          { name: 'password', label: editing ? 'New password' : 'Password', type: 'password', hint: editing ? 'Leave blank to keep the current password' : 'More than 8 characters with upper, lower and special character', full: true },
          ...(editing ? [{ name: 'isActive', label: 'Account is active', type: 'checkbox', full: true } as FieldDef] : []),
        ] as FieldDef[]
      }
      schema={(editing) =>
        z
          .object({ ...base, role: z.enum(['STAFF', 'ADMIN'], { message: 'Select a role' }), password: editing ? z.union([z.literal(''), strongPassword]) : strongPassword })
          .passthrough()
      }
      defaults={{ name: '', email: '', phone: '', role: 'STAFF', password: '', isActive: true }}
      toForm={(r) => ({ name: r.name, email: r.email, phone: r.phone ?? '', role: r.role, password: '', isActive: r.isActive })}
    />
  );
}
