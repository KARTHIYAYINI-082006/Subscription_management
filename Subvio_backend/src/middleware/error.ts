import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: 'Route not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });

  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const field = issue.path.join('.');
    return res.status(400).json({ message: field ? `${field}: ${issue.message}` : issue.message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'value';
      return res.status(409).json({ message: `A record with this ${target} already exists` });
    }
    if (err.code === 'P2025') return res.status(404).json({ message: 'Record not found' });
    if (err.code === 'P2003') {
      return res.status(409).json({ message: 'This record is in use by other records and cannot be deleted' });
    }
  }

  // Errors surfaced from the driver adapter carry the raw PostgreSQL SQLSTATE code.
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    if (/code: "(23001|23503)"/.test(err.message)) {
      return res.status(409).json({ message: 'This record is in use by other records and cannot be deleted' });
    }
    if (/code: "23505"/.test(err.message)) return res.status(409).json({ message: 'A record with this value already exists' });
  }

  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
