import {
  BadgePercent,
  BarChart3,
  Boxes,
  CreditCard,
  FileStack,
  FileText,
  LayoutDashboard,
  Layers,
  Receipt,
  Repeat,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { BillingPeriod, PaymentMethod, Role } from '@/types';

export const STAFF: Role[] = ['ADMIN', 'STAFF'];
const EVERYONE: Role[] = ['ADMIN', 'STAFF', 'CUSTOMER'];

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: EVERYONE }] },
  {
    title: 'Sales',
    items: [
      { to: '/customers', label: 'Customers', icon: Users, roles: STAFF },
      { to: '/templates', label: 'Templates', icon: FileStack, roles: STAFF },
      { to: '/subscriptions', label: 'Subscriptions', icon: Repeat, roles: EVERYONE },
    ],
  },
  {
    title: 'Billing',
    items: [
      { to: '/invoices', label: 'Invoices', icon: FileText, roles: EVERYONE },
      { to: '/payments', label: 'Payments', icon: CreditCard, roles: STAFF },
      { to: '/reports', label: 'Reports', icon: BarChart3, roles: STAFF },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { to: '/products', label: 'Products', icon: Boxes, roles: STAFF },
      { to: '/plans', label: 'Plans', icon: Layers, roles: STAFF },
      { to: '/discounts', label: 'Discounts', icon: BadgePercent, roles: STAFF },
      { to: '/taxes', label: 'Taxes', icon: Receipt, roles: STAFF },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/staff', label: 'Staff', icon: ShieldCheck, roles: ['ADMIN'] },
      { to: '/settings', label: 'Profile', icon: UserRound, roles: EVERYONE },
    ],
  },
];

/** Navigation groups visible to a role. */
export const navFor = (role: Role) =>
  NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter((g) => g.items.length > 0);

/** Routes pinned to the mobile bottom tab bar for each shell. */
export const MOBILE_TABS = {
  console: ['/', '/subscriptions', '/invoices', '/customers'],
  portal: ['/', '/subscriptions', '/invoices', '/settings'],
};

type Tone = 'gray' | 'violet' | 'blue' | 'green' | 'amber' | 'red' | 'ink';

export const STATUS_TONE: Record<string, Tone> = {
  DRAFT: 'gray',
  QUOTATION: 'violet',
  CONFIRMED: 'blue',
  ACTIVE: 'green',
  PAUSED: 'amber',
  CLOSED: 'ink',
  CANCELLED: 'red',
  PAID: 'green',
  OVERDUE: 'red',
};

export const TONE_CLASSES: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-700 ring-gray-200',
  violet: 'bg-brand-50 text-brand-600 ring-brand-300/40',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  ink: 'bg-ink/5 text-ink ring-ink/10',
};

export const BILLING_PERIODS: { value: BillingPeriod; label: string; unit: string }[] = [
  { value: 'DAILY', label: 'Daily', unit: 'day' },
  { value: 'WEEKLY', label: 'Weekly', unit: 'week' },
  { value: 'MONTHLY', label: 'Monthly', unit: 'month' },
  { value: 'YEARLY', label: 'Yearly', unit: 'year' },
];
export const periodUnit = (p: BillingPeriod) => BILLING_PERIODS.find((b) => b.value === p)?.unit ?? '';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE', label: 'Online' },
];

export const PAYMENT_TERMS = [
  { value: '0', label: 'Due on receipt' },
  { value: '7', label: 'Net 7 days' },
  { value: '15', label: 'Net 15 days' },
  { value: '30', label: 'Net 30 days' },
  { value: '45', label: 'Net 45 days' },
];

/** Chart series colours — validated for CVD separation and contrast on light surfaces. */
export const CHART = { primary: '#7C3AED', secondary: '#D97706', grid: '#EFEDF5', axis: '#6E6A82' };

export const PASSWORD_RULES = [
  { label: 'More than 8 characters', test: (v: string) => v.length > 8 },
  { label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'A lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'A special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

/** Converts a monthly list price into a suggested price for the plan's billing period (yearly = 12 months). */
export const PERIOD_PRICE_FACTOR: Record<BillingPeriod, number> = { DAILY: 1 / 30, WEEKLY: 12 / 52, MONTHLY: 1, YEARLY: 12 };

export const SUBSCRIPTION_STATUSES = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED', 'CANCELLED'].map((s) => ({
  value: s,
  label: s.charAt(0) + s.slice(1).toLowerCase(),
}));

/** Issuer details printed on invoices. */
export const COMPANY = {
  name: 'Brightloop Software Pvt. Ltd.',
  address: '4th Floor, Tidel Park, Taramani, Chennai 600113, Tamil Nadu',
  gstin: '33AABCB1234K1Z9',
  email: 'billing@brightloop.in',
};
