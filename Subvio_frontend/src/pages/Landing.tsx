import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgePercent,
  BarChart3,
  BellRing,
  CheckCircle2,
  FileStack,
  Layers,
  Receipt,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/common';
import { Button } from '@/components/ui/button';
import { AuthPanel, SignedInPanel, type AuthMode } from '@/pages/auth/AuthPages';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const FEATURES = [
  { icon: Zap, title: 'Hands-free billing day', text: 'Invoices are created on schedule from every active subscription, with lines, GST and totals filled in. No period is ever billed twice.', tone: 'from-brand-600 to-fuchsia-500' },
  { icon: Layers, title: 'Flexible plans', text: 'Daily to yearly cycles, minimum quantities, availability windows and pause, renew or close rules.', tone: 'from-sky-500 to-brand-500' },
  { icon: FileStack, title: 'Quotes in seconds', text: 'Start from a template, send it, and customers accept online.', tone: 'from-fuchsia-500 to-rose-500' },
  { icon: BadgePercent, title: 'Self-applying discounts', text: 'Fixed or percentage offers with limits and dates, applied automatically.', tone: 'from-amber-500 to-orange-500' },
  { icon: Receipt, title: 'GST-ready taxes', text: 'CGST, SGST and IGST rules calculated on every line.', tone: 'from-emerald-500 to-teal-500' },
  { icon: BarChart3, title: 'Live revenue insights', text: 'MRR, ARR, collections and overdue invoices with CSV export.', tone: 'from-brand-500 to-sky-500' },
];

const LIFECYCLE = [
  { step: 'Draft', text: 'Build the offer from a template' },
  { step: 'Quotation', text: 'Send it for review' },
  { step: 'Confirmed', text: 'Customer accepts online' },
  { step: 'Active', text: 'Invoices run automatically' },
  { step: 'Closed', text: 'Ends on schedule or on request' },
];

const WORKSPACES = [
  { icon: ShieldCheck, title: 'Admin console', text: 'Owns products, plans, taxes, discounts and the team.', points: ['Catalog & pricing rules', 'Staff access control', 'Company-wide analytics'] },
  { icon: Users, title: 'Staff workspace', text: 'Runs the day-to-day billing month.', points: ['Quotes & subscriptions', 'Billing runs & payments', 'Overdue follow-ups'] },
  { icon: UserRound, title: 'Customer portal', text: 'Self-service, without emailing anyone.', points: ['Accept quotations', 'View & pay invoices', 'Track subscriptions'] },
];

const STATS = [
  { value: '4', label: 'Billing frequencies' },
  { value: '3', label: 'Role-based workspaces' },
  { value: '0', label: 'Invoices typed by hand' },
  { value: '1×', label: 'Each period billed exactly once' },
];

const MARQUEE = ['Recurring plans', 'Quotation templates', 'Automated invoices', 'GST taxes', 'Smart discounts', 'One-click payments', 'Overdue tracking', 'MRR & ARR', 'Customer portal', 'CSV exports'];

/* --------------------------------- Helpers --------------------------------- */
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay }} className={className}>
      {children}
    </motion.div>
  );
}

/** Horizontal swipe carousel on phones, regular grid from `md` up. */
function Rail({ children, className }: { children: ReactNode; className: string }) {
  return <div className={cn('no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8 md:mx-0 md:grid md:overflow-visible md:px-0 md:pb-0', className)}>{children}</div>;
}
const railItem = 'w-[80%] shrink-0 snap-start sm:w-[46%] md:w-auto';

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: ReactNode; text: string }) {
  return (
    <Reveal className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
      <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600 ring-1 ring-brand-100">{eyebrow}</span>
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base text-ink-muted">{text}</p>
      <p className="mt-3 text-xs font-medium text-ink-muted/70 md:hidden">Swipe to explore →</p>
    </Reveal>
  );
}

function FloatingChip({ icon: Icon, tone, title, text, className }: { icon: LucideIcon; tone: string; title: string; text: string; className: string }) {
  return (
    <div className={cn('glass absolute z-10 hidden animate-float items-center gap-3 rounded-2xl px-3.5 py-2.5 shadow-lift xl:flex', className)}>
      <span className={cn('flex size-9 items-center justify-center rounded-xl text-white', tone)}>
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs font-bold text-ink">{title}</p>
        <p className="text-[11px] text-ink-muted">{text}</p>
      </div>
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */
export default function Landing({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  /** Guests are taken to the login/sign-up panel; signed-in users go to their dashboard. */
  const openAuth = (m: AuthMode) => {
    if (user) return navigate('/');
    setMode(m);
    document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const gradientBtn = 'bg-gradient-to-r from-brand-600 via-brand-500 to-fuchsia-500 shadow-glow hover:brightness-110';

  return (
    <div className="min-h-full overflow-x-hidden bg-[#fbfaff]">
      {/* Floating navbar */}
      <header className="fixed inset-x-3 top-3 z-40 sm:inset-x-6">
        <div className="glass mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full pl-4 pr-2 shadow-card sm:pl-5">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-ink-muted md:flex">
            <a href="#features" className="transition-colors hover:text-brand-600">Features</a>
            <a href="#lifecycle" className="transition-colors hover:text-brand-600">How it works</a>
            <a href="#workspaces" className="transition-colors hover:text-brand-600">Workspaces</a>
          </nav>
          <div className="flex items-center gap-1">
            {!user && (
              <button onClick={() => openAuth('login')} className="rounded-full px-3 py-2 text-sm font-semibold text-ink hover:text-brand-600">
                Log in
              </button>
            )}
            <Button size="sm" onClick={() => openAuth('signup')} className={cn('h-10 rounded-full px-4', gradientBtn)}>
              {user ? 'Open dashboard' : 'Get started'}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mesh relative">
        <div className="grid-lines pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -left-40 top-20 size-[460px] animate-drift rounded-full bg-brand-300/40 blur-[110px]" />
        <div className="pointer-events-none absolute -right-32 top-40 size-[420px] animate-drift rounded-full bg-fuchsia-300/35 blur-[110px] [animation-delay:-8s]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-32 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-40">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="text-center lg:text-left">
            <span className="glass inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-semibold text-ink shadow-sm">
              <span className="rounded-full bg-gradient-to-r from-brand-600 to-fuchsia-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">New</span>
              Automated billing runs
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
            </span>
            <h1 className="mt-6 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Subscriptions, simplified.
              <br />
              <span className="text-gradient animate-shine">Growth, amplified.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg lg:mx-0">
              Plans, quotations, subscriptions, invoices and payments on one platform, so renewals are never missed and you always know your recurring revenue.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Button size="lg" onClick={() => openAuth('signup')} className={cn('rounded-full px-7', gradientBtn)}>
                {user ? 'Go to dashboard' : 'Start free'} <ArrowRight />
              </Button>
              <a href="#features" className="glass rounded-full px-6 py-2.5 text-sm font-semibold text-ink shadow-sm transition-colors hover:text-brand-600">
                Explore features
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium text-ink-muted lg:justify-start">
              {['GST-ready', 'Self-service portal', 'Live MRR'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" /> {item}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div id="auth" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }} className="relative mx-auto w-full max-w-md scroll-mt-28">
            <FloatingChip icon={CheckCircle2} tone="bg-emerald-500" title="INV-00088 paid" text="₹3,250 · via UPI" className="-left-40 top-8" />
            <FloatingChip icon={TrendingUp} tone="bg-gradient-to-br from-brand-600 to-fuchsia-500" title="MRR ↑ 12.4%" text="₹2,24,260 this month" className="-bottom-7 -right-10 [animation-delay:-2s]" />
            <FloatingChip icon={BellRing} tone="bg-amber-500" title="Renewal in 3 days" text="Business Yearly" className="-left-36 bottom-24 [animation-delay:-4s]" />
            {loading ? null : user ? <SignedInPanel /> : <AuthPanel mode={mode} onModeChange={setMode} />}
          </motion.div>
        </div>
      </section>

      {/* Marquee */}
      <div className="relative overflow-hidden border-y border-line bg-white py-4 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
        <div className="flex w-max animate-marquee gap-10">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={i} className="flex items-center gap-3 whitespace-nowrap text-sm font-semibold text-ink-muted">
              <span className="size-1.5 rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500" /> {item}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-8">
        <Rail className="md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.05} className={cn(railItem, 'w-[60%] sm:w-[40%]')}>
              <div className="h-full rounded-3xl border border-line bg-white p-6 text-center shadow-card">
                <p className="text-gradient text-4xl font-extrabold">{s.value}</p>
                <p className="mt-2 text-xs font-semibold text-ink-muted">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </Rail>
      </section>

      {/* Features — bento grid */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <SectionTitle eyebrow="Features" title={<>Everything a <span className="text-gradient">billing month</span> needs</>} text="Replace spreadsheets, hand-typed invoices and end-of-quarter reports with one connected workflow." />
        <Rail className="md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.06} className={cn(railItem, i === 0 && 'md:col-span-2 md:row-span-2')}>
              <div className={cn('group relative h-full overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift', i === 0 && 'md:p-8')}>
                <div className={cn('pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br opacity-10 blur-2xl transition-opacity group-hover:opacity-25', f.tone)} />
                <span className={cn('relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110', f.tone)}>
                  <f.icon className="size-5" />
                </span>
                <h3 className={cn('relative mt-5 font-bold text-ink', i === 0 ? 'text-xl' : 'text-base')}>{f.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-ink-muted">{f.text}</p>
                {i === 0 && (
                  <div className="relative mt-8 hidden rounded-2xl border border-line bg-cloud p-4 md:block">
                    {[
                      ['INV-00091', 'Sharma Textiles', '₹14,160', 'Paid'],
                      ['INV-00092', 'Reddy Pharma', '₹28,320', 'Confirmed'],
                      ['INV-00093', 'Nair Spices', '₹5,310', 'Draft'],
                    ].map(([no, name, amt, status]) => (
                      <div key={no} className="flex items-center justify-between border-b border-line py-2.5 text-xs last:border-0">
                        <span className="font-semibold text-brand-600">{no}</span>
                        <span className="text-ink">{name}</span>
                        <span className="font-bold text-ink">{amt}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : status === 'Draft' ? 'bg-gray-100 text-gray-600' : 'bg-sky-50 text-sky-700')}>{status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </Rail>
      </section>

      {/* Lifecycle */}
      <section id="lifecycle" className="relative scroll-mt-24 overflow-hidden border-y border-line bg-white py-20 lg:py-28">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <SectionTitle eyebrow="How it works" title="From quote to recurring revenue" text="Every subscription follows a clear lifecycle that anyone on the team can see at a glance." />
          <div className="relative">
            <span className="absolute left-[10%] right-[10%] top-7 hidden h-0.5 bg-gradient-to-r from-brand-300 via-fuchsia-300 to-amber-300 md:block" />
            <Rail className="md:grid-cols-5">
              {LIFECYCLE.map((l, i) => (
                <Reveal key={l.step} delay={i * 0.07} className={cn(railItem, 'w-[62%] sm:w-[38%]')}>
                  <div className="relative flex h-full flex-col items-center rounded-3xl border border-line bg-white/80 p-5 text-center shadow-card md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                    <span className="relative z-10 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-fuchsia-500 text-lg font-extrabold text-white shadow-glow">{i + 1}</span>
                    <p className="mt-4 font-bold text-ink">{l.step}</p>
                    <p className="mt-1 text-xs text-ink-muted">{l.text}</p>
                  </div>
                </Reveal>
              ))}
            </Rail>
          </div>
        </div>
      </section>

      {/* Workspaces */}
      <section id="workspaces" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <SectionTitle eyebrow="Workspaces" title="The right view for every role" text="Admins configure, staff operate, customers serve themselves. Each one sees only what they need." />
        <Rail className="md:grid-cols-3">
          {WORKSPACES.map((w, i) => {
            const featured = i === 1;
            return (
              <Reveal key={w.title} delay={i * 0.08} className={railItem}>
                <div className={cn('relative h-full overflow-hidden rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1', featured ? 'hero-gradient text-white shadow-glow' : 'border border-line bg-white shadow-card')}>
                  <span className={cn('flex size-12 items-center justify-center rounded-2xl', featured ? 'bg-white/20' : 'bg-brand-50 text-brand-600')}>
                    <w.icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-extrabold">{w.title}</h3>
                  <p className={cn('mt-1.5 text-sm', featured ? 'text-white/80' : 'text-ink-muted')}>{w.text}</p>
                  <ul className="mt-6 space-y-2.5">
                    {w.points.map((p) => (
                      <li key={p} className="flex items-center gap-2.5 text-sm font-medium">
                        <CheckCircle2 className={cn('size-4', featured ? 'text-white' : 'text-brand-600')} /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </Rail>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20 sm:px-8">
        <Reveal className="hero-gradient relative mx-auto max-w-6xl overflow-hidden rounded-[32px] px-6 py-14 text-center text-white shadow-glow sm:px-12">
          <div className="pointer-events-none absolute -left-10 -top-10 size-56 animate-drift rounded-full bg-fuchsia-300/40 blur-3xl" />
          <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to automate your billing month?</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/80">Set up your plans once. Subvio handles renewals, invoices and reminders from there.</p>
          <Button variant="light" size="lg" onClick={() => openAuth('signup')} className="relative mt-8 rounded-full px-7">
            {user ? 'Open your dashboard' : 'Create your account'} <ArrowRight />
          </Button>
        </Reveal>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-ink-muted sm:flex-row sm:px-8">
          <Logo />
          <p>© {new Date().getFullYear()} Subvio · Subscriptions, simplified. Growth, amplified.</p>
        </div>
      </footer>
    </div>
  );
}
