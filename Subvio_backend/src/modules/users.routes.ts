import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, notFound, paged, parseList, password, searchWhere, zOptionalText } from '../lib/http';
import { button, sendMailSafe } from '../lib/mailer';
import { authorize, STAFF_ROLES } from '../middleware/auth';
import { createPasswordLink, hashPassword, publicUser } from './auth.routes';

const contact = {
  name: z.string().trim().min(2, 'Name is required'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: zOptionalText,
};

async function listUsers(req: Parameters<typeof parseList>[0], baseWhere: Prisma.UserWhereInput) {
  const { skip, take, page, pageSize, search } = parseList(req);
  const where = { ...baseWhere, ...searchWhere(search, ['name', 'email', 'company', 'phone']) };
  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { ...publicUser, _count: { select: { subscriptions: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);
  return paged(data, total, page, pageSize);
}

/* ---------------------------- Customers ---------------------------- */
export const customersRouter = Router();
customersRouter.use(authorize(...STAFF_ROLES));

const customerSchema = z.object({
  ...contact,
  company: zOptionalText,
  address: zOptionalText,
  gstin: z.preprocess(
    (v) => (v === '' ? null : typeof v === 'string' ? v.toUpperCase() : v),
    z.string().regex(/^[0-9A-Z]{15}$/, 'GSTIN must be 15 letters/digits').nullable().optional(),
  ),
});

customersRouter.get('/', async (req, res) => res.json(await listUsers(req, { role: 'CUSTOMER' })));

customersRouter.get('/:id', async (req, res) => {
  const customer = await prisma.user.findFirst({ where: { id: req.params.id, role: 'CUSTOMER' }, select: publicUser });
  if (!customer) throw notFound('Customer not found');
  res.json(customer);
});

customersRouter.post('/', async (req, res) => {
  const data = customerSchema.parse(req.body);
  const customer = await prisma.user.create({ data: { ...data, role: 'CUSTOMER' }, select: publicUser });
  const link = await createPasswordLink(customer.id, 72);
  sendMailSafe(
    customer.email,
    'Your Subvio customer portal is ready',
    'Welcome to Subvio',
    `<p>Hi ${customer.name},</p><p>An account has been created for you so you can view your subscriptions and invoices online.
     Set your password to get started (link valid for 72 hours).</p><p style="margin:24px 0">${button(link, 'Set password')}</p>`,
  );
  res.status(201).json(customer);
});

customersRouter.put('/:id', async (req, res) => {
  const data = customerSchema.parse(req.body);
  const { count } = await prisma.user.updateMany({ where: { id: req.params.id, role: 'CUSTOMER' }, data });
  if (!count) throw notFound('Customer not found');
  res.json(await prisma.user.findUnique({ where: { id: req.params.id }, select: publicUser }));
});

customersRouter.delete('/:id', async (req, res) => {
  const { count } = await prisma.user.deleteMany({ where: { id: req.params.id, role: 'CUSTOMER' } });
  if (!count) throw notFound('Customer not found');
  res.status(204).end();
});

/* ------------------------------ Staff ------------------------------ */
export const staffRouter = Router();
staffRouter.use(authorize('ADMIN'));

const staffRole = z.enum(['ADMIN', 'STAFF']);
const createStaffSchema = z.object({ ...contact, role: staffRole, password });
const updateStaffSchema = z.object({
  ...contact,
  role: staffRole,
  isActive: z.boolean(),
  password: z.preprocess((v) => (v === '' ? undefined : v), password.optional()),
});

staffRouter.get('/', async (req, res) => res.json(await listUsers(req, { role: { in: ['ADMIN', 'STAFF'] } })));

staffRouter.post('/', async (req, res) => {
  const { password: plain, ...data } = createStaffSchema.parse(req.body);
  const user = await prisma.user.create({
    data: { ...data, passwordHash: await hashPassword(plain) },
    select: publicUser,
  });
  res.status(201).json(user);
});

staffRouter.put('/:id', async (req, res) => {
  const { password: plain, ...data } = updateStaffSchema.parse(req.body);
  if (req.params.id === req.user!.id && (data.role !== 'ADMIN' || !data.isActive)) {
    throw badRequest('You cannot demote or deactivate your own account');
  }
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, role: { in: ['ADMIN', 'STAFF'] } } });
  if (!existing) throw notFound('Staff member not found');
  const user = await prisma.user.update({
    where: { id: existing.id },
    data: { ...data, ...(plain ? { passwordHash: await hashPassword(plain) } : {}) },
    select: publicUser,
  });
  res.json(user);
});
