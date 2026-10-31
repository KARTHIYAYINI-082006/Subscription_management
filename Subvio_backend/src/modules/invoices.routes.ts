import { Router } from 'express';
import { z } from 'zod';
import { PaymentMethod, type Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { HttpError, badRequest, notFound, paged, parseList, searchWhere, zDate, zOptionalText } from '../lib/http';
import { today } from '../lib/dates';
import { button, sendMail } from '../lib/mailer';
import { env } from '../lib/env';
import { authorize, ownScope, STAFF_ROLES } from '../middleware/auth';
import { recordPayment, runBilling } from '../services/billing';
import { publicUser } from './auth.routes';

const staffOnly = authorize(...STAFF_ROLES);
const inr = (n: unknown) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(n));

function statusFilter(status?: string): Prisma.InvoiceWhereInput {
  if (status === 'OVERDUE') return { status: 'CONFIRMED', dueDate: { lt: today() } };
  if (status && ['DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED'].includes(status)) return { status: status as Prisma.EnumInvoiceStatusFilter['equals'] };
  return {};
}

/* ----------------------------- Invoices ---------------------------- */
export const invoicesRouter = Router();

invoicesRouter.get('/', async (req, res) => {
  const { skip, take, page, pageSize, search, status } = parseList(req);
  const where: Prisma.InvoiceWhereInput = {
    AND: [
      ownScope(req),
      req.user!.role === 'CUSTOMER' ? { status: { not: 'DRAFT' } } : {},
      statusFilter(status),
      searchWhere(search, ['number', 'customer.name', 'subscription.number']),
    ],
  };
  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { customer: { select: { id: true, name: true, email: true } }, subscription: { select: { id: true, number: true } } },
      orderBy: [{ issueDate: 'desc' }, { number: 'desc' }],
      skip,
      take,
    }),
    prisma.invoice.count({ where }),
  ]);
  res.json(paged(data, total, page, pageSize));
});

invoicesRouter.post('/generate', staffOnly, async (_req, res) => {
  const result = await runBilling();
  if (result.skipped) throw new HttpError(409, 'A billing run is already in progress. Try again in a moment.');
  res.json(result);
});

async function findInvoice(id: string, req: Parameters<typeof ownScope>[0]) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, ...ownScope(req), ...(req.user!.role === 'CUSTOMER' ? { status: { not: 'DRAFT' } } : {}) },
    include: {
      lines: true,
      payments: { orderBy: { date: 'asc' } },
      customer: { select: publicUser },
      subscription: { select: { id: true, number: true, plan: { select: { name: true, billingPeriod: true } } } },
    },
  });
  if (!invoice) throw notFound('Invoice not found');
  return invoice;
}

invoicesRouter.get('/:id', async (req, res) => res.json(await findInvoice(String(req.params.id), req)));

/** Moves an invoice between statuses only if it is still in one of the expected states. */
async function transition(id: string, from: Prisma.InvoiceWhereInput, status: 'CONFIRMED' | 'CANCELLED', error: string) {
  const { count } = await prisma.invoice.updateMany({ where: { id, ...from }, data: { status } });
  if (!count) throw badRequest(error);
  return prisma.invoice.findUnique({ where: { id } });
}

invoicesRouter.post('/:id/confirm', staffOnly, async (req, res) => {
  res.json(await transition(String(req.params.id), { status: 'DRAFT' }, 'CONFIRMED', 'Only draft invoices can be confirmed'));
});

invoicesRouter.post('/:id/cancel', staffOnly, async (req, res) => {
  res.json(
    await transition(String(req.params.id), { status: { in: ['DRAFT', 'CONFIRMED'] }, amountPaid: 0 }, 'CANCELLED', 'Only unpaid draft or confirmed invoices can be cancelled'),
  );
});

invoicesRouter.post('/:id/send', staffOnly, async (req, res) => {
  const invoice = await findInvoice(String(req.params.id), req);
  if (!['CONFIRMED', 'PAID'].includes(invoice.status)) throw badRequest('Confirm the invoice before sending it');
  const rows = invoice.lines
    .map((l) => `<tr><td style="padding:6px 0">${l.description} × ${l.quantity}</td><td style="text-align:right">${inr(Number(l.amount) + Number(l.taxAmount))}</td></tr>`)
    .join('');
  try {
    await sendMail(
      invoice.customer.email,
      `Invoice ${invoice.number} from Subvio`,
      `Invoice ${invoice.number}`,
      `<p>Hi ${invoice.customer.name},</p>
       <p>Here is your invoice for ${invoice.periodStart.toISOString().slice(0, 10)} to ${invoice.periodEnd.toISOString().slice(0, 10)}.</p>
       <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
         <tr><td style="padding-top:12px;border-top:1px solid #EBE5EF"><b>Total</b></td><td style="padding-top:12px;border-top:1px solid #EBE5EF;text-align:right"><b>${inr(invoice.total)}</b></td></tr>
       </table>
       <p>Due date: <b>${invoice.dueDate.toISOString().slice(0, 10)}</b></p>
       <p style="margin:24px 0">${button(`${env.appUrl}/invoices/${invoice.id}`, 'View invoice')}</p>`,
    );
  } catch (err) {
    console.error('Invoice email failed:', (err as Error).message);
    throw new HttpError(502, 'We could not send the email right now. Please try again later.');
  }
  res.json(await prisma.invoice.update({ where: { id: invoice.id }, data: { sentAt: new Date() } }));
});

const paymentSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  date: zDate,
  note: zOptionalText,
});

invoicesRouter.post('/:id/payments', staffOnly, async (req, res) => {
  res.status(201).json(await recordPayment(String(req.params.id), paymentSchema.parse(req.body)));
});

/** One-click online payment (simulated – no gateway). Customers can only pay their own invoices. */
invoicesRouter.post('/:id/pay', async (req, res) => {
  const invoice = await findInvoice(String(req.params.id), req);
  const outstanding = Number(invoice.total) - Number(invoice.amountPaid);
  res.json(await recordPayment(invoice.id, { method: 'ONLINE', amount: outstanding, date: today(), note: 'Paid online' }));
});

/* ----------------------------- Payments ---------------------------- */
export const paymentsRouter = Router();
paymentsRouter.use(staffOnly);

paymentsRouter.get('/', async (req, res) => {
  const { skip, take, page, pageSize, search, status: method } = parseList(req);
  const where: Prisma.PaymentWhereInput = {
    ...(method && method in PaymentMethod ? { method: method as PaymentMethod } : {}),
    ...searchWhere(search, ['invoice.number', 'invoice.customer.name', 'note']),
  };
  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { invoice: { select: { id: true, number: true, customer: { select: { name: true } } } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    }),
    prisma.payment.count({ where }),
  ]);
  res.json(paged(data, total, page, pageSize));
});
