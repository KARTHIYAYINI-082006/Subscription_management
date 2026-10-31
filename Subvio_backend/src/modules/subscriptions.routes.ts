import { Router } from 'express';
import { z } from 'zod';
import { SubscriptionStatus, type Prisma } from '@prisma/client';
import { prisma, nextNumber } from '../lib/prisma';
import { HttpError, badRequest, notFound, paged, parseList, searchWhere, zDate, zMoney, zOptionalDate, zOptionalText } from '../lib/http';
import { addDays, addPeriod, today } from '../lib/dates';
import { button, sendMailSafe } from '../lib/mailer';
import { env } from '../lib/env';
import { authorize, ownScope, STAFF_ROLES } from '../middleware/auth';
import { billNextPeriod, priceSubscription, pricingInclude } from '../services/billing';
import { publicUser } from './auth.routes';

const router = Router();
const staffOnly = authorize(...STAFF_ROLES);

const subscriptionSchema = z
  .object({
    customerId: z.string().min(1, 'Select a customer'),
    planId: z.string().min(1, 'Select a plan'),
    startDate: zDate,
    expiryDate: zOptionalDate,
    quotationValidUntil: zOptionalDate,
    paymentTermDays: z.coerce.number().int().min(0).max(365),
    notes: zOptionalText,
    lines: z
      .array(
        z.object({
          productId: z.string().min(1, 'Select a product'),
          variantId: z.string().nullish().transform((v) => v || null),
          quantity: z.coerce.number().int().min(1),
          unitPrice: zMoney,
        }),
      )
      .min(1, 'Add at least one product line'),
  })
  .refine((v) => !v.expiryDate || v.expiryDate > v.startDate, { message: 'Expiry date must be after the start date', path: ['expiryDate'] });

type SubscriptionInput = z.infer<typeof subscriptionSchema>;

/** Business-rule checks that need the database: customer, plan availability, minimum quantity, variants. */
async function validate(input: SubscriptionInput) {
  const [customer, plan, variants] = await Promise.all([
    prisma.user.findFirst({ where: { id: input.customerId, role: 'CUSTOMER' } }),
    prisma.plan.findUnique({ where: { id: input.planId } }),
    prisma.productVariant.findMany({ where: { id: { in: input.lines.flatMap((l) => (l.variantId ? [l.variantId] : [])) } } }),
  ]);
  if (!customer) throw badRequest('Customer not found');
  if (!plan) throw badRequest('Plan not found');
  if (plan.startDate && input.startDate < plan.startDate) throw badRequest(`This plan is only available from ${plan.startDate.toISOString().slice(0, 10)}`);
  if (plan.endDate && input.startDate > plan.endDate) throw badRequest('This plan is no longer available for new subscriptions');
  if (input.lines.some((l) => l.quantity < plan.minQuantity)) throw badRequest(`Each line needs a quantity of at least ${plan.minQuantity} for this plan`);
  const variantProduct = new Map(variants.map((v) => [v.id, v.productId]));
  if (input.lines.some((l) => l.variantId && variantProduct.get(l.variantId) !== l.productId)) {
    throw badRequest('A selected variant does not belong to its product');
  }
}

const listInclude = {
  customer: { select: { id: true, name: true, email: true, company: true } },
  plan: { select: { id: true, name: true, billingPeriod: true, price: true } },
  lines: { select: { quantity: true, unitPrice: true } },
} satisfies Prisma.SubscriptionInclude;

router.get('/', async (req, res) => {
  const { skip, take, page, pageSize, search, status } = parseList(req);
  const where: Prisma.SubscriptionWhereInput = {
    ...ownScope(req),
    ...(status && status in SubscriptionStatus ? { status: status as SubscriptionStatus } : {}),
    ...searchWhere(search, ['number', 'customer.name', 'customer.email', 'plan.name']),
  };
  const [rows, total] = await Promise.all([
    prisma.subscription.findMany({ where, include: listInclude, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.subscription.count({ where }),
  ]);
  const data = rows.map(({ lines, ...s }) => ({
    ...s,
    recurringTotal: Number(s.plan.price) + lines.reduce((sum, l) => sum + l.quantity * Number(l.unitPrice), 0),
  }));
  res.json(paged(data, total, page, pageSize));
});

router.get('/:id', async (req, res) => {
  const sub = await prisma.subscription.findFirst({
    where: { id: String(req.params.id), ...ownScope(req) },
    include: {
      ...pricingInclude,
      customer: { select: publicUser },
      invoices: {
        where: req.user!.role === 'CUSTOMER' ? { status: { not: 'DRAFT' } } : {},
        select: { id: true, number: true, status: true, total: true, issueDate: true, dueDate: true, periodStart: true, periodEnd: true },
        orderBy: { periodStart: 'desc' },
      },
    },
  });
  if (!sub) throw notFound('Subscription not found');
  res.json({ ...sub, preview: await priceSubscription(sub) });
});

router.post('/', staffOnly, async (req, res) => {
  const { lines, ...data } = subscriptionSchema.parse(req.body);
  await validate({ ...data, lines });
  const sub = await prisma.$transaction(async (tx) =>
    tx.subscription.create({ data: { ...data, number: await nextNumber('SUB', tx), lines: { create: lines } } }),
  );
  res.status(201).json(sub);
});

router.put('/:id', staffOnly, async (req, res) => {
  const { lines, ...data } = subscriptionSchema.parse(req.body);
  const existing = await prisma.subscription.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) throw notFound('Subscription not found');
  if (!['DRAFT', 'QUOTATION'].includes(existing.status)) throw badRequest('Only draft or quotation subscriptions can be edited');
  await validate({ ...data, lines });
  const sub = await prisma.subscription.update({
    where: { id: existing.id },
    data: { ...data, lines: { deleteMany: {}, create: lines } },
  });
  res.json(sub);
});

router.delete('/:id', staffOnly, async (req, res) => {
  const { count } = await prisma.subscription.deleteMany({
    where: { id: String(req.params.id), status: { in: ['DRAFT', 'CANCELLED'] }, invoices: { none: {} } },
  });
  if (!count) throw badRequest('Only draft or cancelled subscriptions without invoices can be deleted');
  res.status(204).end();
});

router.post('/:id/invoice', staffOnly, async (req, res) => {
  const invoice = await billNextPeriod(String(req.params.id));
  if (!invoice) throw badRequest('Nothing to invoice. The subscription must be active and within its expiry date.');
  res.status(201).json(invoice);
});

type Action = 'send' | 'confirm' | 'activate' | 'pause' | 'resume' | 'renew' | 'close' | 'cancel';
const rules: Record<Action, { from: SubscriptionStatus[]; customerFrom?: SubscriptionStatus[] }> = {
  send: { from: ['DRAFT'] },
  confirm: { from: ['DRAFT', 'QUOTATION'], customerFrom: ['QUOTATION'] },
  activate: { from: ['CONFIRMED'] },
  pause: { from: ['ACTIVE'] },
  resume: { from: ['PAUSED'] },
  renew: { from: ['ACTIVE', 'PAUSED'] },
  close: { from: ['ACTIVE', 'PAUSED'] },
  cancel: { from: ['DRAFT', 'QUOTATION', 'CONFIRMED'], customerFrom: ['QUOTATION'] },
};

router.post('/:id/:action', async (req, res) => {
  const action = req.params.action as Action;
  if (!(action in rules)) throw notFound('Unknown action');
  const sub = await prisma.subscription.findFirst({
    where: { id: String(req.params.id), ...ownScope(req) },
    include: { plan: true, customer: { select: { name: true, email: true } } },
  });
  if (!sub) throw notFound('Subscription not found');

  const allowed = req.user!.role === 'CUSTOMER' ? (rules[action].customerFrom ?? []) : rules[action].from;
  if (!allowed.includes(sub.status)) throw badRequest(`Cannot ${action} a subscription that is ${sub.status.toLowerCase()}`);

  const t = today();
  const { plan } = sub;
  let data: Prisma.SubscriptionUpdateManyMutationInput;
  switch (action) {
    case 'send':
      data = { status: 'QUOTATION', quotationValidUntil: sub.quotationValidUntil ?? addDays(t, 30) };
      break;
    case 'confirm':
      if (sub.status === 'QUOTATION' && sub.quotationValidUntil && sub.quotationValidUntil < t) throw badRequest('This quotation has expired');
      data = { status: 'CONFIRMED' };
      break;
    case 'activate':
      data = { status: 'ACTIVE', nextInvoiceDate: sub.startDate };
      break;
    case 'pause':
      if (!plan.pausable) throw badRequest('This plan does not allow pausing');
      data = { status: 'PAUSED' };
      break;
    case 'resume':
      data = { status: 'ACTIVE', nextInvoiceDate: sub.nextInvoiceDate && sub.nextInvoiceDate < t ? t : sub.nextInvoiceDate };
      break;
    case 'renew':
      if (!plan.renewable) throw badRequest('This plan does not allow renewal');
      if (!sub.expiryDate) throw badRequest('Only subscriptions with an expiry date can be renewed');
      data = { expiryDate: addPeriod(sub.expiryDate, plan.billingPeriod) };
      break;
    case 'close':
      if (!plan.closable && (!sub.expiryDate || sub.expiryDate >= t)) throw badRequest('This plan does not allow early closure');
      data = { status: 'CLOSED', closedAt: new Date(), nextInvoiceDate: null };
      break;
    case 'cancel':
      data = { status: 'CANCELLED', nextInvoiceDate: null };
      break;
  }

  const { count } = await prisma.subscription.updateMany({ where: { id: sub.id, status: sub.status }, data });
  if (!count) throw new HttpError(409, 'This subscription was just updated by someone else. Refresh and try again.');

  if (action === 'send') {
    sendMailSafe(
      sub.customer.email,
      `Quotation ${sub.number} from Subvio`,
      `Your quotation ${sub.number} is ready`,
      `<p>Hi ${sub.customer.name},</p><p>A new quotation for the <b>${plan.name}</b> plan is waiting for your review.</p>
       <p style="margin:24px 0">${button(`${env.appUrl}/subscriptions/${sub.id}`, 'Review quotation')}</p>`,
    );
  }
  res.json(await prisma.subscription.findUnique({ where: { id: sub.id } }));
});

export default router;
