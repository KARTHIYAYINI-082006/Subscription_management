import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Briefcase, Check, Eye, EyeOff, LayoutDashboard, Lock, Mail, MailCheck, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { PASSWORD_RULES } from '@/lib/constants';
import { cn, initials, titleCase } from '@/lib/utils';
import type { Role } from '@/types';

const email = z.string().trim().email('Enter a valid email address');
export const strongPassword = z
  .string()
  .refine((v) => PASSWORD_RULES.every((r) => r.test(v)), 'Password must be more than 8 characters with uppercase, lowercase and a special character');

export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1.5">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value ?? '');
        return (
          <li key={rule.label} className={cn('flex items-center gap-1.5 text-[11px] transition-colors', ok ? 'text-emerald-600' : 'text-ink-muted')}>
            <Check className={cn('size-3', !ok && 'opacity-40')} /> {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

const run = async (fn: () => Promise<void>) => {
  try {
    await fn();
  } catch (err) {
    toast.error((err as Error).message);
  }
};

/* ------------------------------ Building blocks ------------------------------ */
interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
  label: string;
  error?: string;
  children?: ReactNode;
}

const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(({ icon: Icon, label, error, type, children, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-ink">{label}</label>
      <div className="group relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted/70 transition-colors group-focus-within:text-brand-600" />
        <input
          ref={ref}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={Boolean(error)}
          className={cn(
            'h-11 w-full rounded-xl border bg-white/80 pl-10 text-sm text-ink placeholder:text-ink-muted/50 transition-all focus:bg-white focus:outline-none focus:ring-4',
            isPassword ? 'pr-11' : 'pr-3.5',
            error ? 'border-rose-300 focus:ring-rose-100' : 'border-line hover:border-brand-200 focus:border-brand-400 focus:ring-brand-100',
          )}
          {...props}
        />
        {isPassword && (
          <button type="button" onClick={() => setVisible((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-muted/70 hover:text-brand-600" aria-label={visible ? 'Hide password' : 'Show password'}>
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {children}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
});
AuthField.displayName = 'AuthField';

/** Frosted white card with an animated gradient edge and soft colour glow behind it. */
function GlassPanel({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute -inset-4 rounded-[40px] bg-gradient-to-br from-brand-400/30 via-fuchsia-300/25 to-amber-200/30 blur-2xl" />
      <div className="relative animate-shine rounded-[30px] bg-[linear-gradient(110deg,#c4b5fd,#f0abfc,#fde68a,#c4b5fd)] bg-[length:200%_100%] p-px shadow-pop">
        <div className="rounded-[29px] bg-white/90 p-6 backdrop-blur-2xl sm:p-8">{children}</div>
      </div>
    </div>
  );
}

const PrimarySubmit = ({ loading, children }: { loading: boolean; children: ReactNode }) => (
  <Button type="submit" size="lg" loading={loading} className="w-full bg-gradient-to-r from-brand-600 via-brand-500 to-fuchsia-500 shadow-glow hover:brightness-110">
    {children}
  </Button>
);

/** Returns the selected role, or flags the role picker and returns null when none is chosen. */
type RequireRole = () => Role | null;

const ROLES: { value: Role; label: string; icon: LucideIcon }[] = [
  { value: 'CUSTOMER', label: 'Customer', icon: UserRound },
  { value: 'STAFF', label: 'Staff', icon: Briefcase },
  { value: 'ADMIN', label: 'Admin', icon: ShieldCheck },
];

function RolePicker({ value, onChange, error }: { value: Role | null; onChange: (role: Role) => void; error: boolean }) {
  return (
    <div className="mb-5 space-y-1.5">
      <p id="role-label" className="text-xs font-semibold text-ink">
        Select your role
      </p>
      <div role="radiogroup" aria-labelledby="role-label" className="grid grid-cols-3 gap-2">
        {ROLES.map(({ value: r, label, icon: Icon }) => {
          const active = value === r;
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(r)}
              className={cn(
                'flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-all',
                active
                  ? 'border-brand-400 bg-brand-50 text-brand-700 ring-4 ring-brand-100'
                  : cn('bg-white/80 text-ink-muted hover:border-brand-200 hover:text-ink', error ? 'border-rose-300' : 'border-line'),
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-rose-600">Select your role to continue</p>}
    </div>
  );
}

function GoogleButton({ requireRole }: { requireRole: RequireRole }) {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const onClick = () => {
    const role = requireRole();
    if (!role) return;
    setLoading(true);
    run(async () => {
      try {
        const pending = await loginWithGoogle(role);
        if (pending) toast.success(pending, { duration: 8000 });
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
        throw err;
      }
    }).finally(() => setLoading(false));
  };
  return (
    <Button variant="outline" size="lg" className="w-full" onClick={onClick} loading={loading}>
      {!loading && (
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
        </svg>
      )}
      Continue with Google
    </Button>
  );
}

/* ------------------------------ Login & sign up ------------------------------ */
export type AuthMode = 'login' | 'signup';

const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required') });
const signupSchema = z
  .object({ name: z.string().trim().min(2, 'Enter your full name'), email, password: strongPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });

/** Shared demo logins so visitors can explore each workspace. Clicking one fills the form and selects its role. */
const DEMO: { label: string; role: Role; email: string; password: string }[] = [
  { label: 'Admin', role: 'ADMIN', email: 'admin@subvio.com', password: 'Admin@1234' },
  { label: 'Staff', role: 'STAFF', email: 'staff@subvio.com', password: 'Staff@1234' },
  { label: 'Customer', role: 'CUSTOMER', email: 'customer@subvio.com', password: 'Customer@1234' },
];

function LoginForm({ requireRole, onPickRole }: { requireRole: RequireRole; onPickRole: (role: Role) => void }) {
  const { login } = useAuth();
  const { register, handleSubmit, setValue, clearErrors, formState } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  const { errors, isSubmitting } = formState;
  const onValid = (v: z.infer<typeof loginSchema>) => {
    const role = requireRole();
    if (role) return run(() => login(v.email, v.password, role));
  };
  return (
    <>
      <form onSubmit={handleSubmit(onValid, () => requireRole())} className="space-y-4" noValidate>
        <AuthField icon={Mail} label="Email" type="email" autoComplete="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
        <AuthField icon={Lock} label="Password" type="password" autoComplete="current-password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            Forgot password?
          </Link>
        </div>
        <PrimarySubmit loading={isSubmitting}>Log in</PrimarySubmit>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
        <span className="text-[11px] text-ink-muted">Try a demo:</span>
        {DEMO.map((d) => (
          <button
            key={d.role}
            type="button"
            onClick={() => {
              setValue('email', d.email);
              setValue('password', d.password);
              clearErrors();
              onPickRole(d.role);
            }}
            className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100 transition-colors hover:bg-brand-100"
          >
            {d.label}
          </button>
        ))}
      </div>
    </>
  );
}

function SignupForm({ requireRole, onPending }: { requireRole: RequireRole; onPending: () => void }) {
  const { signup } = useAuth();
  const { register, handleSubmit, watch, formState } = useForm<z.infer<typeof signupSchema>>({ resolver: zodResolver(signupSchema) });
  const { errors, isSubmitting } = formState;
  const onValid = (v: z.infer<typeof signupSchema>) => {
    const role = requireRole();
    if (!role) return;
    return run(async () => {
      const pending = await signup(v.name, v.email, v.password, role);
      if (pending) {
        toast.success(pending, { duration: 8000 });
        onPending();
      }
    });
  };
  return (
    <form onSubmit={handleSubmit(onValid, () => requireRole())} className="space-y-4" noValidate>
      <AuthField icon={UserRound} label="Full name" autoComplete="name" placeholder="Aarav Sharma" error={errors.name?.message} {...register('name')} />
      <AuthField icon={Mail} label="Email" type="email" autoComplete="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
      <AuthField icon={Lock} label="Password" type="password" autoComplete="new-password" placeholder="Create a strong password" error={errors.password?.message} {...register('password')}>
        <PasswordChecklist value={watch('password')} />
      </AuthField>
      <AuthField icon={Lock} label="Confirm password" type="password" autoComplete="new-password" placeholder="Re-enter password" error={errors.confirm?.message} {...register('confirm')} />
      <PrimarySubmit loading={isSubmitting}>Create account</PrimarySubmit>
    </form>
  );
}

/** Login / sign-up panel embedded in the landing page. */
export function AuthPanel({ mode, onModeChange }: { mode: AuthMode; onModeChange: (mode: AuthMode) => void }) {
  const [role, setRole] = useState<Role | null>(null);
  const [roleError, setRoleError] = useState(false);
  const requireRole: RequireRole = () => {
    if (!role) setRoleError(true);
    return role;
  };
  const needsApproval = mode === 'signup' && (role === 'STAFF' || role === 'ADMIN');
  const pickRole = (r: Role) => {
    setRole(r);
    setRoleError(false);
  };
  return (
    <GlassPanel>
      <div className="relative mb-6 grid grid-cols-2 rounded-full bg-cloud p-1 ring-1 ring-line">
        {(['login', 'signup'] as const).map((m) => (
          <button key={m} type="button" onClick={() => onModeChange(m)} className={cn('relative z-10 rounded-full py-2 text-sm font-semibold transition-colors', mode === m ? 'text-white' : 'text-ink-muted hover:text-ink')}>
            {mode === m && <motion.span layoutId="auth-tab" className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-brand-600 to-fuchsia-500 shadow-glow" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            {m === 'login' ? 'Log in' : 'Sign up'}
          </button>
        ))}
      </div>
      <h2 className="text-xl font-extrabold tracking-tight text-ink">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
      <p className="mb-6 mt-1 text-sm text-ink-muted">{mode === 'login' ? 'Log in to manage subscriptions and billing.' : 'See and manage your subscriptions in one place.'}</p>
      <RolePicker value={role} error={roleError} onChange={pickRole} />
      {needsApproval && role && (
        <p className="-mt-2 mb-5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          {titleCase(role)} accounts must be approved by an existing admin before you can log in.
        </p>
      )}
      <motion.div key={mode} initial={{ opacity: 0, x: mode === 'login' ? -8 : 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
        {mode === 'login' ? <LoginForm requireRole={requireRole} onPickRole={pickRole} /> : <SignupForm requireRole={requireRole} onPending={() => onModeChange('login')} />}
      </motion.div>
      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-ink-muted/70">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <GoogleButton requireRole={requireRole} />
    </GlassPanel>
  );
}

/** Shown on the home page instead of the login form when the user is already signed in. */
export function SignedInPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <GlassPanel>
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-fuchsia-500 text-lg font-extrabold text-white shadow-glow">{initials(user.name)}</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink-muted">Signed in as</p>
          <p className="truncate text-lg font-extrabold tracking-tight text-ink">{user.name}</p>
          <p className="truncate text-xs text-ink-muted">
            {user.email} · {titleCase(user.role)}
          </p>
        </div>
      </div>
      <p className="mb-6 mt-6 text-sm text-ink-muted">Welcome back! Pick up right where you left off.</p>
      <Button size="lg" onClick={() => navigate('/')} className="w-full bg-gradient-to-r from-brand-600 via-brand-500 to-fuchsia-500 shadow-glow hover:brightness-110">
        <LayoutDashboard /> Open dashboard <ArrowRight />
      </Button>
      <button onClick={logout} className="mt-4 w-full text-center text-sm font-semibold text-ink-muted hover:text-rose-600">
        Not you? Log out
      </button>
    </GlassPanel>
  );
}

/* --------------------------- Forgot & reset password --------------------------- */
function AuthScreen({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mesh relative flex min-h-full flex-col overflow-hidden">
      <div className="grid-lines pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -left-24 top-10 size-80 animate-drift rounded-full bg-brand-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-80 animate-drift rounded-full bg-fuchsia-300/30 blur-3xl [animation-delay:-8s]" />
      <div className="relative flex items-center justify-between px-5 py-5 sm:px-10">
        <Link to="/">
          <Logo />
        </Link>
        <Link to="/" className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-brand-700">
          <ArrowLeft className="size-3.5" /> Back to home
        </Link>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-5 pb-16 pt-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full max-w-md">
          <GlassPanel>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
            <p className="mb-6 mt-1.5 text-sm text-ink-muted">{subtitle}</p>
            {children}
          </GlassPanel>
        </motion.div>
      </div>
    </div>
  );
}

const footerLink = 'mt-6 block text-center text-sm font-semibold text-brand-600 hover:text-brand-700';

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState('');
  const { register, handleSubmit, formState } = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email })) });

  if (sentTo) {
    return (
      <AuthScreen title="Check your inbox" subtitle={`If an account exists for ${sentTo}, a reset link is on its way.`}>
        <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-700 ring-1 ring-brand-100">
          <MailCheck className="size-5 shrink-0" /> The link expires in 1 hour.
        </div>
        <Link to="/login" className={footerLink}>
          Back to log in
        </Link>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Forgot password?" subtitle="Enter your registered email and we'll send you a reset link.">
      <form
        onSubmit={handleSubmit((v) =>
          run(async () => {
            await api.post('/auth/forgot-password', v);
            setSentTo(v.email);
          }),
        )}
        className="space-y-5"
        noValidate
      >
        <AuthField icon={Mail} label="Email" type="email" placeholder="you@company.com" error={formState.errors.email?.message} {...register('email')} />
        <PrimarySubmit loading={formState.isSubmitting}>Send reset link</PrimarySubmit>
      </form>
      <Link to="/login" className={footerLink}>
        Back to log in
      </Link>
    </AuthScreen>
  );
}

const resetSchema = z.object({ password: strongPassword, confirm: z.string() }).refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const { register, handleSubmit, watch, formState } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });

  return (
    <AuthScreen title="Set a new password" subtitle="Choose a strong password for your account.">
      {!token ? (
        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">This reset link is invalid. Please request a new one.</p>
      ) : (
        <form
          onSubmit={handleSubmit((v) =>
            run(async () => {
              await api.post('/auth/reset-password', { token, password: v.password });
              toast.success('Password updated. Please log in.');
              navigate('/login');
            }),
          )}
          className="space-y-4"
          noValidate
        >
          <AuthField icon={Lock} label="New password" type="password" autoComplete="new-password" error={formState.errors.password?.message} {...register('password')}>
            <PasswordChecklist value={watch('password')} />
          </AuthField>
          <AuthField icon={Lock} label="Confirm password" type="password" autoComplete="new-password" error={formState.errors.confirm?.message} {...register('confirm')} />
          <PrimarySubmit loading={formState.isSubmitting}>Update password</PrimarySubmit>
        </form>
      )}
      <Link to="/forgot-password" className={footerLink}>
        Request a new link
      </Link>
    </AuthScreen>
  );
}
