import { app } from './app';
import { env } from './lib/env';
import { prisma } from './lib/prisma';
import { runBilling } from './services/billing';

const BILLING_INTERVAL_MS = 60 * 60_000;

async function billingJob() {
  try {
    const { created, closed } = await runBilling();
    if (created || closed) console.log(`Billing run: ${created} invoices created, ${closed} subscriptions closed`);
  } catch (err) {
    console.error('Billing run failed:', (err as Error).message);
  }
}

const server = app.listen(env.port, () => {
  console.log(`Subvio API listening on port ${env.port}`);
  setTimeout(billingJob, 10_000);
  setInterval(billingJob, BILLING_INTERVAL_MS);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
