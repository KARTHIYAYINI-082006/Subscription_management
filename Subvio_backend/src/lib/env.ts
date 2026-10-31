import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const origins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

export const env = {
  databaseUrl: required('DATABASE_URL'),
  directUrl: process.env.DIRECT_URL || required('DATABASE_URL'),
  dnsServers: (process.env.DNS_SERVERS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  port: Number(process.env.PORT ?? 5000),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigins: origins,
  appUrl: origins[0],
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? '',
  email: {
    host: process.env.EMAIL_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT ?? 587),
    user: process.env.EMAIL_USER ?? '',
    password: process.env.EMAIL_PASSWORD ?? '',
    from: process.env.EMAIL_FROM ?? process.env.EMAIL_USER ?? '',
  },
};
