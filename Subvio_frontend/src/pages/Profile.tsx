import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, KeyRound, Mail, Pencil, ShieldCheck, X } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { PageTransition } from '@/components/common';
import { PasswordChecklist, strongPassword } from '@/pages/auth/AuthPages';
import { useAuth } from '@/context/AuthContext';
import { useAction } from '@/hooks/useResource';
import { api, type ApiError } from '@/lib/api';
import { formatDate, initials, titleCase } from '@/lib/utils';
import type { User } from '@/types';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  phone: z.string(),
  company: z.string(),
  address: z.string(),
  gstin: z.string().trim().regex(/^$|^[0-9A-Za-z]{15}$/, 'GSTIN must be 15 letters/digits'),
});
type ProfileValues = z.infer<typeof profileSchema>;

const FIELDS: { name: keyof ProfileValues; label: string; full?: boolean; multiline?: boolean }[] = [
  { name: 'name', label: 'Full name' },
  { name: 'phone', label: 'Phone' },
  { name: 'company', label: 'Company' },
  { name: 'gstin', label: 'GSTIN' },
  { name: 'address', label: 'Billing address', full: true, multiline: true },
];

const toValues = (u: User): ProfileValues => ({ name: u.name, phone: u.phone ?? '', company: u.company ?? '', address: u.address ?? '', gstin: u.gstin ?? '' });

function DetailsCard({ user }: { user: User }) {
  const { refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const { register, handleSubmit, reset, formState } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), values: toValues(user) });
  const save = useAction((v: ProfileValues) => api.patch('/auth/me', v), {
    success: 'Profile updated',
    onSuccess: async () => {
      await refresh();
      setEditing(false);
    },
  });
  const cancel = () => {
    reset(toValues(user));
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader
        title="Personal details"
        description={editing ? 'Update your details and save.' : 'Your contact and billing information.'}
        action={
          !editing && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil /> Edit profile
            </Button>
          )
        }
      />
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="px-5 pb-5">
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Email" hint={editing ? 'Email cannot be changed' : undefined}>
            {editing ? <Input value={user.email} disabled /> : <p className="py-1 text-sm font-semibold text-ink">{user.email}</p>}
          </Field>
          {FIELDS.map((f) => (
            <Field key={f.name} label={f.label} error={formState.errors[f.name]?.message} className={f.full ? 'sm:col-span-2' : undefined}>
              {editing ? (
                f.multiline ? <Textarea {...register(f.name)} /> : <Input {...register(f.name)} aria-invalid={Boolean(formState.errors[f.name])} />
              ) : (
                <p className="whitespace-pre-line py-1 text-sm font-semibold text-ink">{toValues(user)[f.name] || <span className="font-normal text-ink-muted">Not provided</span>}</p>
              )}
            </Field>
          ))}
        </div>
        {editing && (
          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              Save changes
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

const newPasswordSchema = z
  .object({ newPassword: strongPassword, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });

/** Step 1 verifies the current password; only then are the new-password fields shown. */
function SecurityCard({ user }: { user: User }) {
  const { refresh } = useAuth();
  const [current, setCurrent] = useState('');
  const [verified, setVerified] = useState(!user.hasPassword);
  const [verifyError, setVerifyError] = useState('');
  const { register, handleSubmit, watch, reset, formState } = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirm: '' },
  });

  const [checking, setChecking] = useState(false);
  const verify = async () => {
    if (!current) return setVerifyError('Enter your current password');
    setChecking(true);
    try {
      await api.post('/auth/login', { email: user.email, password: current });
      setVerifyError('');
      setVerified(true);
    } catch (err) {
      setVerifyError((err as ApiError).status === 401 ? 'Current password is incorrect' : (err as Error).message);
    } finally {
      setChecking(false);
    }
  };
  const update = useAction((v: z.infer<typeof newPasswordSchema>) => api.post('/auth/change-password', { currentPassword: current, newPassword: v.newPassword }), {
    success: user.hasPassword ? 'Password updated' : 'Password set — you can now log in with email too',
    onSuccess: async () => {
      reset();
      setCurrent('');
      await refresh();
      setVerified(false);
    },
  });

  const startOver = () => {
    reset();
    setCurrent('');
    setVerified(!user.hasPassword);
  };

  return (
    <Card>
      <CardHeader title={user.hasPassword ? 'Change password' : 'Set a password'} description={user.hasPassword ? 'Confirm your current password to continue.' : 'You signed in with Google. Add a password to also log in with email.'} />
      <div className="px-5 pb-5">
        <ol className="mb-5 flex items-center gap-2 text-[11px] font-semibold">
          {(user.hasPassword ? ['Verify', 'New password'] : ['New password']).map((label, i, all) => {
            const done = all.length === 2 && i === 0 && verified;
            const active = all.length === 1 || (i === 0 ? !verified : verified);
            return (
              <li key={label} className="flex items-center gap-2">
                <span className={`flex size-5 items-center justify-center rounded-full ${done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-600 text-white' : 'bg-cloud text-ink-muted ring-1 ring-line'}`}>{i + 1}</span>
                <span className={active || done ? 'text-ink' : 'text-ink-muted'}>{label}</span>
                {i < all.length - 1 && <span className="mx-1 h-px w-6 bg-line" />}
              </li>
            );
          })}
        </ol>
        <AnimatePresence mode="wait" initial={false}>
          {!verified ? (
            <motion.form
              key="verify"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onSubmit={(e) => {
                e.preventDefault();
                verify();
              }}
              className="space-y-4"
              noValidate
            >
              <Field label="Current password" error={verifyError}>
                <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} aria-invalid={Boolean(verifyError)} />
              </Field>
              <Button type="submit" className="w-full" loading={checking}>
                <KeyRound /> Verify password
              </Button>
            </motion.form>
          ) : (
            <motion.form key="update" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} onSubmit={handleSubmit((v) => update.mutate(v))} className="space-y-4" noValidate>
              {user.hasPassword && (
                <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <ShieldCheck className="size-4" /> Identity verified
                </p>
              )}
              <Field label="New password" error={formState.errors.newPassword?.message}>
                <Input type="password" autoComplete="new-password" autoFocus {...register('newPassword')} />
                <PasswordChecklist value={watch('newPassword')} />
              </Field>
              <Field label="Re-enter new password" error={formState.errors.confirm?.message}>
                <Input type="password" autoComplete="new-password" {...register('confirm')} />
              </Field>
              <div className="flex gap-2">
                {user.hasPassword && (
                  <Button variant="outline" onClick={startOver} aria-label="Cancel">
                    <X />
                  </Button>
                )}
                <Button type="submit" className="flex-1" loading={update.isPending}>
                  Update password
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <PageTransition>
      <div className="hero-gradient relative mb-6 overflow-hidden rounded-3xl p-6 text-white shadow-glow sm:p-8">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-40 [mask-image:none]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-white/20 text-2xl font-extrabold ring-4 ring-white/20 backdrop-blur">{initials(user.name)}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-extrabold tracking-tight">{user.name}</h1>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-white/30">{titleCase(user.role)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/75">
              <span className="flex items-center gap-1.5">
                <Mail className="size-4" /> {user.email}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" /> Member since {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <DetailsCard user={user} />
        <SecurityCard key={String(user.hasPassword)} user={user} />
      </div>
    </PageTransition>
  );
}
