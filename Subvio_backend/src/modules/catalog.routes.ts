import { Router } from 'express';
import { z } from 'zod';
import { crudRouter, relateIds } from '../lib/crud';
import { STAFF_ROLES } from '../middleware/auth';
import { zMoney, zOptionalDate, zOptionalText } from '../lib/http';

const ids = z.array(z.string()).default([]);
const optionalNumber = z.preprocess((v) => (v === '' || v === null || v === undefined ? null : v), z.coerce.number().min(0).nullable());
const dateRange = <T extends { startDate?: Date | null; endDate?: Date | null }>(v: T) =>
  !v.startDate || !v.endDate || v.endDate >= v.startDate;
const rangeError = { message: 'End date must be on or after the start date', path: ['endDate'] };

/* ------------------------------ Taxes ------------------------------ */
export const taxesRouter = crudRouter({
  model: 'tax',
  readRoles: STAFF_ROLES,
  writeRoles: ['ADMIN'],
  searchFields: ['name'],
  orderBy: { name: 'asc' },
  schema: z.object({
    name: z.string().trim().min(1, 'Name is required'),
    rate: z.coerce.number().min(0).max(100),
    description: zOptionalText,
  }),
});

/* ----------------------------- Products ---------------------------- */
const variantSchema = z.object({
  id: z.string().optional(),
  attribute: z.string().trim().min(1, 'Attribute is required'),
  value: z.string().trim().min(1, 'Value is required'),
  extraPrice: zMoney.default(0),
});

export const productsRouter = crudRouter({
  model: 'product',
  readRoles: STAFF_ROLES,
  writeRoles: ['ADMIN'],
  searchFields: ['name', 'description'],
  include: { variants: true, taxes: true },
  schema: z.object({
    name: z.string().trim().min(1, 'Name is required'),
    type: z.enum(['SERVICE', 'GOODS']),
    salesPrice: zMoney,
    costPrice: zMoney.default(0),
    description: zOptionalText,
    taxIds: ids,
    variants: z.array(variantSchema).default([]),
  }),
  toData: ({ taxIds, variants, ...rest }, mode) => {
    const fields = (v: z.infer<typeof variantSchema>) => ({ attribute: v.attribute, value: v.value, extraPrice: v.extraPrice });
    return {
      ...rest,
      taxes: relateIds(taxIds, mode),
      variants:
        mode === 'create'
          ? { create: variants.map(fields) }
          : {
              deleteMany: { id: { notIn: variants.flatMap((v) => (v.id ? [v.id] : [])) } },
              upsert: variants.map((v) => ({ where: { id: v.id ?? '' }, update: fields(v), create: fields(v) })),
            },
    };
  },
});

/* ------------------------------ Plans ------------------------------ */
export const plansRouter = crudRouter({
  model: 'plan',
  readRoles: STAFF_ROLES,
  writeRoles: ['ADMIN'],
  searchFields: ['name', 'description'],
  include: { _count: { select: { subscriptions: true } } },
  schema: z
    .object({
      name: z.string().trim().min(1, 'Name is required'),
      price: zMoney,
      billingPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
      minQuantity: z.coerce.number().int().min(1),
      startDate: zOptionalDate,
      endDate: zOptionalDate,
      autoClose: z.boolean(),
      closable: z.boolean(),
      pausable: z.boolean(),
      renewable: z.boolean(),
      description: zOptionalText,
    })
    .refine(dateRange, rangeError),
});

/* ---------------------------- Discounts ---------------------------- */
export const discountsRouter = crudRouter({
  model: 'discount',
  readRoles: STAFF_ROLES,
  writeRoles: ['ADMIN'],
  searchFields: ['name'],
  include: { products: { select: { id: true, name: true } } },
  schema: z
    .object({
      name: z.string().trim().min(1, 'Name is required'),
      type: z.enum(['FIXED', 'PERCENTAGE']),
      value: z.coerce.number().positive('Value must be greater than 0'),
      scope: z.enum(['SUBSCRIPTION', 'PRODUCTS']),
      minPurchase: zMoney.default(0),
      minQuantity: z.coerce.number().int().min(0).default(0),
      maxDiscount: optionalNumber,
      startDate: zOptionalDate,
      endDate: zOptionalDate,
      usageLimit: z.preprocess((v) => (v === '' || v === null || v === undefined ? null : v), z.coerce.number().int().min(1).nullable()),
      isActive: z.boolean().default(true),
      productIds: ids,
    })
    .refine((v) => v.type !== 'PERCENTAGE' || v.value <= 100, { message: 'Percentage cannot exceed 100', path: ['value'] })
    .refine((v) => v.scope !== 'PRODUCTS' || v.productIds.length > 0, { message: 'Select at least one product', path: ['productIds'] })
    .refine(dateRange, rangeError),
  toData: ({ productIds, scope, ...rest }, mode) => ({
    ...rest,
    scope,
    products: relateIds(scope === 'PRODUCTS' ? productIds : [], mode),
  }),
});

/* ----------------------- Quotation templates ----------------------- */
export const templatesRouter = crudRouter({
  model: 'quotationTemplate',
  readRoles: STAFF_ROLES,
  writeRoles: STAFF_ROLES,
  searchFields: ['name', 'plan.name'],
  include: { plan: true, lines: { include: { product: { select: { id: true, name: true, salesPrice: true } } } } },
  schema: z.object({
    name: z.string().trim().min(1, 'Name is required'),
    validityDays: z.coerce.number().int().min(1).max(365),
    planId: z.string().min(1, 'Select a plan'),
    notes: zOptionalText,
    lines: z
      .array(z.object({ productId: z.string().min(1, 'Select a product'), quantity: z.coerce.number().int().min(1) }))
      .min(1, 'Add at least one product line'),
  }),
  toData: ({ lines, ...rest }, mode) => ({
    ...rest,
    lines: mode === 'create' ? { create: lines } : { deleteMany: {}, create: lines },
  }),
});

export const catalogRouter = Router()
  .use('/taxes', taxesRouter)
  .use('/products', productsRouter)
  .use('/plans', plansRouter)
  .use('/discounts', discountsRouter)
  .use('/templates', templatesRouter);
