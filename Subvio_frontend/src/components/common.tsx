import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Inbox, Loader2, Search, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form';
import { cn } from '@/lib/utils';

/** Brand mark: a recurring loop (renewal cycle) on a violet → fuchsia tile. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-gradient-to-br from-brand-600 via-brand-500 to-fuchsia-500 shadow-glow">
        <span className="absolute inset-x-0 top-0 h-1/2 bg-white/15" />
        <svg viewBox="0 0 24 24" className="relative size-5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4.5 12a7.5 7.5 0 0 1 12.9-5.2" />
          <path d="M17.8 3.6v3.6h-3.6" />
          <path d="M19.5 12a7.5 7.5 0 0 1-12.9 5.2" />
          <path d="M6.2 20.4v-3.6h3.6" />
          <circle cx="12" cy="12" r="1.6" fill="#fff" stroke="none" />
        </svg>
      </span>
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight text-ink">
          Sub<span className="bg-gradient-to-r from-brand-600 to-fuchsia-500 bg-clip-text text-transparent">vio</span>
        </span>
      )}
    </div>
  );
}

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
      <div className="min-w-0">
        {back && (
          <Link to={back} className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink-muted shadow-sm transition-colors hover:text-brand-600">
            <ArrowLeft className="size-3.5" /> Back
          </Link>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-brand-600" />
    </div>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'default' }: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; tone?: 'default' | 'danger' }) {
  return (
    <Card className="group relative overflow-hidden p-4 transition-shadow hover:shadow-lift sm:p-5">
      <span className={cn('pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-100', tone === 'danger' ? 'bg-rose-100' : 'bg-brand-50')} />
      <div className="relative flex items-center gap-3">
        <span className={cn('flex size-9 items-center justify-center rounded-xl', tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-gradient-to-br from-brand-50 to-white text-brand-600 ring-1 ring-brand-300/30')}>
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-semibold text-ink-muted">{label}</p>
      </div>
      <p className="relative mt-3 truncate text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{value}</p>
      {hint && <p className="relative mt-0.5 truncate text-xs text-ink-muted">{hint}</p>}
    </Card>
  );
}

function StateMessage({ icon: Icon, tone, title, message, action }: { icon: LucideIcon; tone: string; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className={cn('mb-4 flex size-12 items-center justify-center rounded-2xl', tone)}>
        <Icon className="size-5" />
      </span>
      <p className="font-bold text-ink">{title}</p>
      {message && <p className="mt-1 max-w-sm text-xs text-ink-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', message, action }: { title?: string; message?: string; action?: ReactNode }) {
  return <StateMessage icon={Inbox} tone="bg-brand-50 text-brand-600" title={title} message={message} action={action} />;
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <StateMessage
      icon={AlertTriangle}
      tone="bg-rose-50 text-rose-600"
      title="Could not load data"
      message={message ?? 'Something went wrong.'}
      action={onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
    />
  );
}

interface ToolbarProps {
  search: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  status?: string;
  onStatus?: (v: string) => void;
  statusOptions?: { value: string; label: string }[];
  statusLabel?: string;
}

export function Toolbar({ search, onSearch, placeholder = 'Search…', status, onStatus, statusOptions, statusLabel = 'All statuses' }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="relative flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className="rounded-full bg-cloud pl-10" aria-label="Search" />
      </div>
      {statusOptions && onStatus && (
        <div className="sm:w-48">
          <Select value={status} onChange={(e) => onStatus(e.target.value)} aria-label="Filter" className="rounded-full">
            <option value="">{statusLabel}</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}

export function NameCell({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="min-w-0 max-w-[260px]">
      <p className="truncate font-semibold text-ink">{title}</p>
      {subtitle && <p className="truncate text-xs text-ink-muted">{subtitle}</p>}
    </div>
  );
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right font-semibold text-ink">{children}</span>
    </div>
  );
}
