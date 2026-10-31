import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const inrFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const inrCompact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });

export const inr = (value: number | string | null | undefined) => inrFormat.format(Number(value ?? 0));
export const inrShort = (value: number) => inrCompact.format(value);

/** Formats an ISO date (stored as UTC midnight) without timezone shifts. */
export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const formatMonth = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });

/** ISO string → value for <input type="date">. */
export const toInputDate = (value: string | null | undefined) => (value ? value.slice(0, 10) : '');

export function inputDate(offsetDays = 0, from = new Date()) {
  const d = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays));
  return d.toISOString().slice(0, 10);
}

export const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');

export const isOverdue = (inv: { status: string; dueDate: string }) =>
  inv.status === 'CONFIRMED' && inv.dueDate.slice(0, 10) < inputDate();

export const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
