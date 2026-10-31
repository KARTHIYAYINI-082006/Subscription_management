import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './lib/env';
import { authenticate } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';
import authRoutes from './modules/auth.routes';
import { customersRouter, staffRouter } from './modules/users.routes';
import { catalogRouter } from './modules/catalog.routes';
import subscriptionRoutes from './modules/subscriptions.routes';
import { invoicesRouter, paymentsRouter } from './modules/invoices.routes';
import reportRoutes from './modules/reports.routes';

export const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false });
app.use('/api/auth', authLimiter, authRoutes);

const api = express.Router();
api.use(authenticate);
api.use('/customers', customersRouter);
api.use('/staff', staffRouter);
api.use('/', catalogRouter);
api.use('/subscriptions', subscriptionRoutes);
api.use('/invoices', invoicesRouter);
api.use('/payments', paymentsRouter);
api.use('/reports', reportRoutes);
app.use('/api', api);

app.use(notFoundHandler);
app.use(errorHandler);
