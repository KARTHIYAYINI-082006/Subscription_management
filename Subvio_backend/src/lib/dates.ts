import type { BillingPeriod } from '@prisma/client';

const DAY = 86_400_000;

/** Today's date at 00:00 UTC (matches how @db.Date columns are stored). */
export function today() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY);
}

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** Start of the next billing period after `date`. */
export function addPeriod(date: Date, period: BillingPeriod, count = 1) {
  switch (period) {
    case 'DAILY':
      return addDays(date, count);
    case 'WEEKLY':
      return addDays(date, 7 * count);
    case 'MONTHLY':
      return addMonths(date, count);
    case 'YEARLY':
      return addMonths(date, 12 * count);
  }
}

/** Multiplier that converts one billing period's amount to a monthly amount. */
export const monthlyFactor: Record<BillingPeriod, number> = {
  DAILY: 30,
  WEEKLY: 52 / 12,
  MONTHLY: 1,
  YEARLY: 1 / 12,
};
