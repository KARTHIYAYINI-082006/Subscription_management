import type { Discount, Prisma } from '@prisma/client';
import { prisma, nextNumber } from '../lib/prisma';
import { addDays, addPeriod, today } from '../lib/dates';
import { badRequest, notFound } from '../lib/http';

type Db = Prisma.TransactionClient;

export const pricingInclude = {
  plan: true,
  lines: { include: { product: { include: { taxes: true } }, variant: true } },
} satisfies Prisma.SubscriptionInclude;

export type PricedSubscription = Prisma.SubscriptionGetPayload<{ include: typeof pricingInclude }>;
type DiscountWithProducts = Discount & { products: { id: string }[] };

interface RawLine {
  description: string;
  productId: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const gross = (l: RawLine) => l.quantity * l.unitPrice;

function rawLines(sub: PricedSubscription): RawLine[] {
  const lines: RawLine[] = [];
  const planFee = Number(sub.plan.price);
  if (planFee > 0) {
    lines.push({ description: `${sub.plan.name} plan fee`, productId: null, quantity: 1, unitPrice: planFee, taxRate: 0 });
  }
  for (const l of sub.lines) {
    lines.push({
      description: l.variant ? `${l.product.name} (${l.variant.attribute}: ${l.variant.value})` : l.product.name,
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: Number(l.unitPrice),
      taxRate: l.product.taxes.reduce((sum, t) => sum + Number(t.rate), 0),
    });
  }
  return lines;
}

/** Returns which lines a discount applies to and how much it is worth (0 if not eligible). */
function evaluateDiscount(d: DiscountWithProducts, lines: RawLine[]) {
  const productIds = new Set(d.products.map((p) => p.id));
  const eligible = d.scope === 'PRODUCTS' ? lines.filter((l) => l.productId && productIds.has(l.productId)) : lines;
  const base = eligible.reduce((s, l) => s + gross(l), 0);
  const qty = eligible.filter((l) => l.productId).reduce((s, l) => s + l.quantity, 0);
  if (!eligible.length || base <= 0 || base < Number(d.minPurchase) || qty < d.minQuantity) return { amount: 0, eligible };
  let amount = d.type === 'PERCENTAGE' ? (base * Number(d.value)) / 100 : Number(d.value);
  if (d.maxDiscount !== null) amount = Math.min(amount, Number(d.maxDiscount));
  return { amount: round2(Math.min(amount, base)), eligible };
}

async function activeDiscounts(db: Db) {
  const t = today();
  const discounts = await db.discount.findMany({
    where: {
      isActive: true,
      AND: [{ OR: [{ startDate: null }, { startDate: { lte: t } }] }, { OR: [{ endDate: null }, { endDate: { gte: t } }] }],
    },
    include: { products: { select: { id: true } } },
  });
  return discounts.filter((d) => d.usageLimit === null || d.usedCount < d.usageLimit);
}

/** Prices a subscription for one billing period, automatically applying the best eligible discount and product taxes. */
export async function priceSubscription(sub: PricedSubscription, db: Db = prisma, applyDiscounts = true) {
  const lines = rawLines(sub);
  let best: { discount: DiscountWithProducts; amount: number; eligible: RawLine[] } | null = null;
  if (applyDiscounts) {
    for (const discount of await activeDiscounts(db)) {
      const result = evaluateDiscount(discount, lines);
      if (result.amount > 0 && (!best || result.amount > best.amount)) best = { discount, ...result };
    }
  }

  // Allocate the discount across eligible lines proportionally; last line absorbs rounding.
  const lineDiscounts = new Map<RawLine, number>();
  if (best) {
    const base = best.eligible.reduce((s, l) => s + gross(l), 0);
    let remaining = best.amount;
    best.eligible.forEach((l, i) => {
      const share = i === best!.eligible.length - 1 ? remaining : round2((best!.amount * gross(l)) / base);
      lineDiscounts.set(l, share);
      remaining = round2(remaining - share);
    });
  }

  const priced = lines.map((l) => {
    const discount = lineDiscounts.get(l) ?? 0;
    const amount = round2(gross(l) - discount);
    return { ...l, discount, amount, taxAmount: round2((amount * l.taxRate) / 100) };
  });

  const subtotal = round2(lines.reduce((s, l) => s + gross(l), 0));
  const discountAmount = round2(priced.reduce((s, l) => s + l.discount, 0));
  const taxAmount = round2(priced.reduce((s, l) => s + l.taxAmount, 0));
  return {
    lines: priced,
    subtotal,
    discountAmount,
    taxAmount,
    total: round2(subtotal - discountAmount + taxAmount),
    discount: best ? { id: best.discount.id, name: best.discount.name, usageLimit: best.discount.usageLimit } : null,
  };
}

/**
 * Invoices the next unbilled period of a subscription.
 * The period is claimed with a conditional update, and (subscriptionId, periodStart) is unique,
 * so the same period can never be billed twice even when runs overlap.
 * Returns null when there is nothing to bill.
 */
export async function billNextPeriod(subscriptionId: string, dueBy?: Date) {
  return prisma.$transaction(
    async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { id: subscriptionId }, include: pricingInclude });
      if (!sub || sub.status !== 'ACTIVE' || !sub.nextInvoiceDate) return null;
      const periodStart = sub.nextInvoiceDate;
      if (dueBy && periodStart > dueBy) return null;
      if (sub.expiryDate && periodStart > sub.expiryDate) return null;

      const nextStart = addPeriod(periodStart, sub.plan.billingPeriod);
      const claimed = await tx.subscription.updateMany({
        where: { id: sub.id, nextInvoiceDate: periodStart },
        data: { nextInvoiceDate: nextStart },
      });
      if (claimed.count === 0) return null;

      let pricing = await priceSubscription(sub, tx);
      if (pricing.discount) {
        const { id, usageLimit } = pricing.discount;
        const used = await tx.discount.updateMany({
          where: usageLimit === null ? { id } : { id, usedCount: { lt: usageLimit } },
          data: { usedCount: { increment: 1 } },
        });
        if (used.count === 0) pricing = await priceSubscription(sub, tx, false);
      }

      const issueDate = today();
      return tx.invoice.create({
        data: {
          number: await nextNumber('INV', tx),
          subscriptionId: sub.id,
          customerId: sub.customerId,
          periodStart,
          periodEnd: addDays(nextStart, -1),
          issueDate,
          dueDate: addDays(issueDate, sub.paymentTermDays),
          subtotal: pricing.subtotal,
          discountAmount: pricing.discountAmount,
          discountName: pricing.discount?.name ?? null,
          taxAmount: pricing.taxAmount,
          total: pricing.total,
          lines: {
            create: pricing.lines.map((l) => ({
              description: l.description,
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.discount,
              taxRate: l.taxRate,
              taxAmount: l.taxAmount,
              amount: l.amount,
            })),
          },
        },
      });
    },
    { timeout: 20_000 },
  );
}

let running = false;
const MAX_PERIODS_PER_RUN = 24;
const CONCURRENCY = 5;

/** Bills every due period of all active subscriptions, then auto-closes expired subscriptions whose plan requires it. */
export async function runBilling() {
  if (running) return { created: 0, closed: 0, skipped: true };
  running = true;
  try {
    const t = today();
    const due = await prisma.subscription.findMany({
      where: { status: 'ACTIVE', nextInvoiceDate: { lte: t } },
      select: { id: true },
    });

    let created = 0;
    const billOne = async (id: string) => {
      for (let i = 0; i < MAX_PERIODS_PER_RUN; i++) {
        try {
          if (!(await billNextPeriod(id, t))) break;
          created++;
        } catch (err) {
          console.error(`Billing failed for subscription ${id}:`, (err as Error).message);
          break;
        }
      }
    };
    for (let i = 0; i < due.length; i += CONCURRENCY) {
      await Promise.all(due.slice(i, i + CONCURRENCY).map((s) => billOne(s.id)));
    }

    const { count: closed } = await prisma.subscription.updateMany({
      where: { status: { in: ['ACTIVE', 'PAUSED'] }, expiryDate: { lt: t }, plan: { autoClose: true } },
      data: { status: 'CLOSED', closedAt: new Date(), nextInvoiceDate: null },
    });
    return { created, closed, skipped: false };
  } finally {
    running = false;
  }
}

export interface PaymentInput {
  method: Prisma.PaymentCreateInput['method'];
  amount: number;
  date: Date;
  note?: string | null;
}

/** Records a payment against a confirmed invoice and marks it paid once fully settled. */
export async function recordPayment(invoiceId: string, input: PaymentInput) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw notFound('Invoice not found');
    if (invoice.status !== 'CONFIRMED') throw badRequest('Only confirmed invoices can receive payments');
    const outstanding = round2(Number(invoice.total) - Number(invoice.amountPaid));
    const amount = round2(input.amount);
    if (amount <= 0 || amount > outstanding) {
      throw badRequest(`Amount must be between 0.01 and the outstanding ${outstanding.toFixed(2)}`);
    }
    await tx.payment.create({ data: { invoiceId, method: input.method, amount, date: input.date, note: input.note ?? null } });
    const amountPaid = round2(Number(invoice.amountPaid) + amount);
    return tx.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid, status: amountPaid >= Number(invoice.total) ? 'PAID' : 'CONFIRMED' },
    });
  });
}
