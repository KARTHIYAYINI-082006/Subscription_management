import './dns';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env';

// Serialize Decimal columns as plain numbers in JSON responses.
(Prisma.Decimal.prototype as unknown as { toJSON: () => number }).toJSON = function (this: Prisma.Decimal) {
  return this.toNumber();
};

// Queries run through the node-postgres driver (Node networking, verified TLS, connection pool).
// Neon closes idle connections and suspends its compute when unused, and home/office networks drop quiet
// TCP sockets, so the pool keeps sockets alive, recycles them early, and allows time for a cold start.
const adapter = new PrismaPg(
  {
    connectionString: env.databaseUrl,
    max: 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 30_000,
    maxLifetimeSeconds: 300,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  },
  { onPoolError: (err) => console.warn(`Database: idle connection closed (${err.message})`) },
);

const base = new PrismaClient({ adapter });

// PostgreSQL SQLSTATEs meaning the connection itself was lost: server shutdown/restart (57P01-57P03, also sent
// while Neon wakes a suspended compute) and connection exceptions (08xxx).
const LOST_CONNECTION_SQLSTATE = /\b(57P01|57P02|57P03|08000|08001|08003|08004|08006)\b/;

/** True for errors caused by a lost or unreachable database connection (not by the query itself). */
export function isConnectionError(err: unknown) {
  const code = (err as { code?: string })?.code;
  if (code === 'P1001' || code === 'P1002' || code === 'P1017') return true;
  const message = (err as Error)?.message ?? '';
  return (
    LOST_CONNECTION_SQLSTATE.test(message) ||
    /Connection terminated|connection timeout|timeout exceeded when trying to connect|Server has closed the connection|Can't reach database server|ECONNRESET|ETIMEDOUT|EPIPE|EAI_AGAIN/i.test(message)
  );
}

/** The query was never sent to the server, so repeating it cannot apply a write twice. */
const failedBeforeSending = (err: unknown) =>
  /connection timeout|timeout exceeded when trying to connect|Can't reach database server|EAI_AGAIN|\b57P03\b/i.test((err as Error)?.message ?? '') ||
  (err as { code?: string })?.code === 'P1001';

const READ_OPERATIONS = new Set(['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy', '$queryRaw', '$queryRawUnsafe']);
const RETRY_DELAYS_MS = [400, 1200];

/**
 * Retries a query when the database connection drops. Reads are always safe to repeat; writes are
 * repeated only when the connection failed before the query reached the server.
 * The extension only wraps execution and never changes result types, so it is exposed as a plain PrismaClient.
 */
export const prisma = base.$extends({
  query: {
    async $allOperations({ operation, args, query }) {
      for (let attempt = 0; ; attempt++) {
        try {
          return await query(args);
        } catch (err) {
          const retryable = isConnectionError(err) && (READ_OPERATIONS.has(operation) || failedBeforeSending(err));
          if (!retryable || attempt >= RETRY_DELAYS_MS.length) throw err;
          console.warn(`Database: connection lost during ${operation}, retrying (${attempt + 1}/${RETRY_DELAYS_MS.length})`);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        }
      }
    },
  },
}) as unknown as PrismaClient;

/** Atomically increments a named counter and returns a formatted document number, e.g. SUB-00042. */
export async function nextNumber(name: 'SUB' | 'INV', tx: Prisma.TransactionClient = prisma) {
  const counter = await tx.counter.upsert({
    where: { name },
    update: { value: { increment: 1 } },
    create: { name, value: 1 },
  });
  return `${name}-${String(counter.value).padStart(5, '0')}`;
}
