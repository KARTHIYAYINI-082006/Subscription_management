import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../lib/env';
import { prisma } from '../lib/prisma';
import { HttpError, forbidden } from '../lib/http';

export interface AuthUser {
  id: string;
  role: Role;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Authentication required');
  let userId: string;
  try {
    userId = (jwt.verify(header.slice(7), env.jwtSecret) as jwt.JwtPayload).sub as string;
  } catch {
    throw new HttpError(401, 'Session expired, please log in again');
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, name: true, isActive: true },
  });
  if (!user || !user.isActive) throw new HttpError(401, 'Account is inactive or no longer exists');
  req.user = { id: user.id, role: user.role, email: user.email, name: user.name };
  next();
}

export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw forbidden();
    next();
  };

export const STAFF_ROLES: Role[] = ['ADMIN', 'STAFF'];

/** Restricts a query to the current customer's own records when the user is a customer. */
export function ownScope(req: Request) {
  return req.user!.role === 'CUSTOMER' ? { customerId: req.user!.id } : {};
}
