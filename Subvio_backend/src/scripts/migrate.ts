/**
 * Applies pending SQL migrations from prisma/migrations using the node-postgres driver,
 * recording them in Prisma's "_prisma_migrations" table (same format as `prisma migrate deploy`).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import { env } from '../lib/env';
import '../lib/dns';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../prisma/migrations');
const sha256 = (text: string) => crypto.createHash('sha256').update(text).digest('hex');

async function main() {
  const client = new Client({ connectionString: env.directUrl });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )`);
    const { rows } = await client.query<{ migration_name: string }>(
      'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL',
    );
    const applied = new Set(rows.map((r) => r.migration_name));
    const pending = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !applied.has(d.name))
      .map((d) => d.name)
      .sort();

    for (const name of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count) VALUES ($1, $2, $3, now(), 1)',
          [crypto.randomUUID(), sha256(sql), name],
        );
        await client.query('COMMIT');
        console.log(`✔ Applied ${name}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    console.log(pending.length ? `Done: ${pending.length} migration(s) applied.` : 'Database is up to date.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
