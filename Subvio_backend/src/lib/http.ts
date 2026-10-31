import type { Request } from 'express';
import { z } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const notFound = (msg = 'Record not found') => new HttpError(404, msg);
export const forbidden = (msg = 'You do not have permission to perform this action') => new HttpError(403, msg);

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(10),
  search: z.string().trim().optional(),
  status: z.string().optional(),
});

/** Parses standard list query params (page, pageSize, search, status). */
export function parseList(req: Request) {
  const q = listQuery.parse(req.query);
  return { ...q, skip: (q.page - 1) * q.pageSize, take: q.pageSize };
}

export function paged<T>(data: T[], total: number, page: number, pageSize: number) {
  return { data, total, page, pageSize };
}

/** Builds a case-insensitive OR filter across the given fields. Supports nested paths like "customer.name". */
export function searchWhere(search: string | undefined, fields: string[]) {
  if (!search) return {};
  return {
    OR: fields.map((path) =>
      path
        .split('.')
        .reverse()
        .reduce<object>((acc, key) => ({ [key]: acc }), { contains: search, mode: 'insensitive' }),
    ),
  };
}

// Reusable zod helpers
export const zDate = z.coerce.date();
export const zOptionalDate = z.preprocess((v) => (v === '' || v === undefined ? null : v), z.coerce.date().nullable());
export const zOptionalText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());
export const zMoney = z.coerce.number().min(0).max(9_999_999_999);
export const password = z
  .string()
  .min(9, 'Password must be more than 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');
