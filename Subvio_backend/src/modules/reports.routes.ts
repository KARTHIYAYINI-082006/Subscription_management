import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { addDays, addMonths, today } from '../lib/dates';
import { authorize, STAFF_ROLES } from '../middleware/auth';

const router = Router();

const sum = (v: unknown) => Number(v ?? 0);
const monthStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

async function monthlyRecurringRevenue() {
  const [row] = await prisma.$queryRaw<{ mrr: number }[]>`
    SELECT COALESCE(SUM((p.price + COALESCE(l.total, 0)) *
      CASE p."billingPeriod" WHEN 'DAILY' THEN 30 WHEN 'WEEKLY' THEN 52.0 / 12 WHEN 'MONTHLY' THEN 1 ELSE 1.0 / 12 END), 0)::float AS mrr
    FROM "Subscription" s
    JOIN "Plan" p ON p.id = s."planId"
    LEFT JOIN (SELECT "subscriptionId", SUM(quantity * "unitPrice") AS total FROM "SubscriptionLine" GROUP BY 1) l
      ON l."subscriptionId" = s.id
    WHERE s.status = 'ACTIVE'`;
  return Math.round(row.mrr * 100) / 100;
}

/** Per-month invoiced amount, collected payments and new subscriptions between two dates (inclusive). */
function monthlyTrend(from: Date, to: Date) {
  return prisma.$queryRaw<{ month: string; invoiced: number; collected: number; newSubscriptions: number }[]>`
    SELECT to_char(m, 'YYYY-MM') AS month,
      COALESCE((SELECT SUM(total) FROM "Invoice" WHERE status IN ('CONFIRMED', 'PAID')
        AND "issueDate" >= m AND "issueDate" < m + interval '1 month'), 0)::float AS invoiced,
      COALESCE((SELECT SUM(amount) FROM "Payment" WHERE date >= m AND date < m + interval '1 month'), 0)::float AS collected,
      (SELECT COUNT(*) FROM "Subscription" WHERE status IN ('ACTIVE', 'PAUSED', 'CLOSED')
        AND "startDate" >= m AND "startDate" < m + interval '1 month')::int AS "newSubscriptions"
    FROM generate_series(date_trunc('month', ${from}::date), date_trunc('month', ${to}::date), interval '1 month') AS m
    ORDER BY m`;
}

async function receivables() {
  const [outstanding, overdue] = await Promise.all([
    prisma.invoice.aggregate({ where: { status: 'CONFIRMED' }, _sum: { total: true, amountPaid: true }, _count: true }),
    prisma.invoice.aggregate({ where: { status: 'CONFIRMED', dueDate: { lt: today() } }, _sum: { total: true, amountPaid: true }, _count: true }),
  ]);
  return {
    outstandingAmount: sum(outstanding._sum.total) - sum(outstanding._sum.amountPaid),
    outstandingCount: outstanding._count,
    overdueAmount: sum(overdue._sum.total) - sum(overdue._sum.amountPaid),
    overdueCount: overdue._count,
  };
}

const subscriptionCard = { customer: { select: { name: true } }, plan: { select: { name: true } } };

router.get('/dashboard', async (req, res) => {
  const t = today();

  if (req.user!.role === 'CUSTOMER') {
    const customerId = req.user!.id;
    const [activeSubscriptions, pendingQuotations, due, paid, subscriptions, invoices] = await Promise.all([
      prisma.subscription.count({ where: { customerId, status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { customerId, status: 'QUOTATION' } }),
      prisma.invoice.aggregate({ where: { customerId, status: 'CONFIRMED' }, _sum: { total: true, amountPaid: true }, _count: true }),
      prisma.payment.aggregate({ where: { invoice: { customerId } }, _sum: { amount: true } }),
      prisma.subscription.findMany({ where: { customerId, status: { not: 'DRAFT' } }, include: subscriptionCard, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.invoice.findMany({ where: { customerId, status: { not: 'DRAFT' } }, orderBy: { issueDate: 'desc' }, take: 5 }),
    ]);
    return res.json({
      activeSubscriptions,
      pendingQuotations,
      outstandingAmount: sum(due._sum.total) - sum(due._sum.amountPaid),
      unpaidInvoices: due._count,
      totalPaid: sum(paid._sum.amount),
      subscriptions,
      invoices,
    });
  }

  const overdueWhere = { status: 'CONFIRMED' as const, dueDate: { lt: t } };
  const [customers, activeSubscriptions, products, mrr, money, revenueThisMonth, statusGroups, trend, recentSubscriptions, overdueInvoices, upcomingRenewals] =
    await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count(),
      monthlyRecurringRevenue(),
      receivables(),
      prisma.payment.aggregate({ where: { date: { gte: monthStart(t) } }, _sum: { amount: true } }),
      prisma.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
      monthlyTrend(addMonths(monthStart(t), -5), t),
      prisma.subscription.findMany({ include: subscriptionCard, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.invoice.findMany({ where: overdueWhere, include: { customer: { select: { name: true } } }, orderBy: { dueDate: 'asc' }, take: 5 }),
      prisma.subscription.findMany({
        where: { status: 'ACTIVE', expiryDate: { gte: t, lte: addDays(t, 30) } },
        include: subscriptionCard,
        orderBy: { expiryDate: 'asc' },
        take: 5,
      }),
    ]);

  res.json({
    customers,
    activeSubscriptions,
    products,
    mrr,
    arr: mrr * 12,
    revenueThisMonth: sum(revenueThisMonth._sum.amount),
    ...money,
    statusDistribution: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
    trend,
    recentSubscriptions,
    overdueInvoices,
    upcomingRenewals,
  });
});

const rangeSchema = z.object({
  from: z.coerce.date().default(() => addMonths(monthStart(today()), -5)),
  to: z.coerce.date().default(() => today()),
});

router.get('/summary', authorize(...STAFF_ROLES), async (req, res) => {
  const { from, to } = rangeSchema.parse(req.query);
  const end = addDays(to, 1);
  const inRange = { gte: from, lt: end };
  const billed = { status: { in: ['CONFIRMED' as const, 'PAID' as const] }, issueDate: inRange };

  const [collected, invoiced, newSubscriptions, closedSubscriptions, activeSubscriptions, mrr, money, trend, byPlan, byProduct] = await Promise.all([
    prisma.payment.aggregate({ where: { date: inRange }, _sum: { amount: true }, _count: true }),
    prisma.invoice.aggregate({ where: billed, _sum: { total: true }, _count: true }),
    prisma.subscription.count({ where: { status: { in: ['ACTIVE', 'PAUSED', 'CLOSED'] }, startDate: inRange } }),
    prisma.subscription.count({ where: { status: 'CLOSED', closedAt: inRange } }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    monthlyRecurringRevenue(),
    receivables(),
    monthlyTrend(from, to),
    prisma.$queryRaw<{ name: string; revenue: number }[]>`
      SELECT p.name, SUM(i.total)::float AS revenue
      FROM "Invoice" i JOIN "Subscription" s ON s.id = i."subscriptionId" JOIN "Plan" p ON p.id = s."planId"
      WHERE i.status IN ('CONFIRMED', 'PAID') AND i."issueDate" >= ${from} AND i."issueDate" < ${end}
      GROUP BY p.name ORDER BY revenue DESC LIMIT 8`,
    prisma.$queryRaw<{ name: string; revenue: number }[]>`
      SELECT COALESCE(pr.name, 'Plan fees') AS name, SUM(l.amount)::float AS revenue
      FROM "InvoiceLine" l JOIN "Invoice" i ON i.id = l."invoiceId" LEFT JOIN "Product" pr ON pr.id = l."productId"
      WHERE i.status IN ('CONFIRMED', 'PAID') AND i."issueDate" >= ${from} AND i."issueDate" < ${end}
      GROUP BY 1 ORDER BY revenue DESC LIMIT 8`,
  ]);

  res.json({
    collected: sum(collected._sum.amount),
    paymentsCount: collected._count,
    invoiced: sum(invoiced._sum.total),
    invoicesCount: invoiced._count,
    newSubscriptions,
    closedSubscriptions,
    activeSubscriptions,
    mrr,
    arr: mrr * 12,
    ...money,
    trend,
    byPlan,
    byProduct,
  });
});

const csvCell = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get('/export', authorize(...STAFF_ROLES), async (req, res) => {
  const { from, to } = rangeSchema.parse(req.query);
  const invoices = await prisma.invoice.findMany({
    where: { issueDate: { gte: from, lt: addDays(to, 1) } },
    include: { customer: { select: { name: true, email: true } }, subscription: { select: { number: true } } },
    orderBy: { issueDate: 'asc' },
    take: 20_000,
  });
  const header = ['Invoice', 'Subscription', 'Customer', 'Email', 'Status', 'Issue date', 'Due date', 'Subtotal', 'Discount', 'Tax', 'Total', 'Paid', 'Outstanding'];
  const rows = invoices.map((i) => [
    i.number, i.subscription.number, i.customer.name, i.customer.email, i.status, i.issueDate, i.dueDate,
    i.subtotal, i.discountAmount, i.taxAmount, i.total, i.amountPaid, Number(i.total) - Number(i.amountPaid),
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="subvio-invoices-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

export default router;
