import './dns';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env';

// Serialize Decimal columns as plain numbers in JSON responses.
(Prisma.Decimal.prototype as unknown as { toJSON: () => number }).toJSON = function (this: Prisma.Decimal) {
  return this.toNumber();
};

// Queries run through the node-postgres driver (Node networking, verified TLS, connection pool).
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.databaseUrl, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 15_000 }),
});

/** Atomically increments a named counter and returns a formatted document number, e.g. SUB-00042. */
export async function nextNumber(name: 'SUB' | 'INV', tx: Prisma.TransactionClient = prisma) {
  const counter = await tx.counter.upsert({
    where: { name },
    update: { value: { increment: 1 } },
    create: { name, value: 1 },
  });
  return `${name}-${String(counter.value).padStart(5, '0')}`;
}
