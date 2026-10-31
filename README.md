# Subvio — Subscription Management System

**Subscriptions, simplified. Growth, amplified.**

Subvio is a full-stack platform for running a subscription business end to end: products and plans, quotations, subscriptions, automated recurring invoices, discounts, GST taxes, payments and revenue reporting, with an admin console, a staff workspace and a self-service customer portal.

Built for the *Brightloop Software* problem statement.

---

## Features

| Area | What it does |
| --- | --- |
| **Authentication** | Email + password signup/login (JWT + bcrypt), Google sign-in (Firebase), forgot/reset password via emailed link. One account per email. Passwords must be more than 8 characters with uppercase, lowercase and a special character. |
| **Roles** | **Admin**: full control, manages staff, products, plans, taxes, discounts. **Staff**: customers, quotations, subscriptions, invoices, payments, reports. **Customer**: portal with only their own subscriptions and invoices. |
| **Products** | Name, type, sales/cost price, notes, default taxes, and variants with extra price (e.g. *Brand: Odoo +₹560*). |
| **Plans** | Plan fee, billing period (daily/weekly/monthly/yearly), minimum quantity, availability dates, and per-plan rules: auto-close at expiry, early closure, pause, renew. |
| **Quotation templates** | Reusable plan + product lines + validity days; one click to start a new quotation. |
| **Subscriptions** | Auto-numbered (`SUB-00001`), with customer, plan, start/expiry dates, payment terms and product lines. Lifecycle **Draft → Quotation → Confirmed → Active → Closed**, plus Paused and Cancelled. Customers can accept or decline quotations in the portal. |
| **Recurring billing** | Invoices (`INV-00001`) are generated automatically every hour for due subscriptions, or on demand ("Run billing" / "Create invoice"). Each billing period is claimed atomically and `(subscription, periodStart)` is unique, so **nothing is billed twice or skipped**. |
| **Taxes** | CGST / SGST / IGST rules applied per product line automatically. |
| **Discounts** | Fixed or percentage, whole subscription or specific products, minimum purchase/quantity, max cap, date window, usage limit. The best eligible discount is applied to the next invoice automatically and stops when it expires or runs out. |
| **Invoices** | Draft → Confirmed → Paid (or Cancelled), with overdue detection. Confirm, cancel, email to the customer, and print/save as PDF. |
| **Payments** | Staff record payments (method, amount, date, note) with partial-payment support. Customers pay with a one-click **Pay now** button (simulated checkout, no real gateway). |
| **Dashboard & reports** | MRR, ARR, active subscriptions, collected, outstanding and overdue amounts; revenue trend, subscription growth, revenue by plan/product; date-range filters and CSV export. |

The UI is responsive from 375 px up to 1920 px: a collapsible sidebar, a mobile drawer, tables that hide minor columns on small screens, and a print-ready invoice layout.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, shadcn-style components (Radix UI), Framer Motion, TanStack Query, React Hook Form + Zod, Recharts, Lucide icons, Firebase Auth (Google)
- **Backend:** Node.js, Express 5, TypeScript, Prisma ORM (node-postgres driver adapter), Zod, JWT, bcrypt, Nodemailer, Helmet, rate limiting
- **Database:** PostgreSQL on Neon
- **Deployment:** Vercel (frontend), Render (backend), Neon (database)

## Project structure

```
.
├── backend
│   ├── prisma/            schema.prisma, migrations, seed.ts (demo data)
│   └── src/
│       ├── lib/           env, prisma client, http helpers, dates, mailer, generic CRUD router
│       ├── middleware/    JWT auth + role guard, error handler
│       ├── services/      billing.ts: pricing, discounts, taxes, invoice generation, payments
│       ├── modules/       auth, users (customers/staff), catalog, subscriptions, invoices, reports
│       ├── app.ts         Express app
│       └── index.ts       server + hourly billing job
├── frontend
│   └── src/
│       ├── components/    ui primitives, layout, DataTable, CrudPage, ResourceForm, charts
│       ├── context/       AuthContext
│       ├── hooks/         data hooks (list/item/action/table state)
│       ├── lib/           api client, constants, utils, firebase
│       ├── pages/         auth, dashboard, catalog, subscriptions, invoices, reports, settings
│       └── types/
└── README.md
```

## Getting started (local)

**Requirements:** Node.js 20 or later, plus a Neon (or any PostgreSQL) database.

### 1. Backend

```bash
cd backend
cp .env.example .env        # then fill in DATABASE_URL, DIRECT_URL, JWT_SECRET, EMAIL_*, FIREBASE_PROJECT_ID
npm install
npm run db:migrate          # create tables (applies prisma/migrations)
npm run db:seed             # optional: demo data (wipes existing data)
npm run dev                 # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api + Firebase web config
npm install
npm run dev                 # http://localhost:5173
```

### Demo accounts (after seeding)

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@subvio.com | Admin@1234 |
| Staff | staff@subvio.com | Staff@1234 |
| Customer | customer@subvio.com | Customer@1234 |

On the login page, the **Try a demo** buttons fill in these accounts and select their role. Otherwise, select the matching role (Customer, Staff or Admin) before logging in. The email, password and role must all match. Customer sign-ups can log in straight away; Staff and Admin sign-ups stay inactive until an existing admin approves them on the **Staff** page. The seed creates 26 customers, 11 products, 6 plans, 5 templates, 6 discounts, 31 subscriptions, and invoices and payments produced by the real billing engine.

## Environment variables

**backend/.env**

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string with `?sslmode=verify-full` |
| `DIRECT_URL` | Neon **direct** connection string with `?sslmode=verify-full` (used for migrations) |
| `DNS_SERVERS` | Optional, e.g. `1.1.1.1,8.8.8.8`. Used only when the system DNS can't resolve a host (some ISP/office networks block `neon.tech`). Leave empty in production |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Token signing secret and lifetime (e.g. `7d`) |
| `FRONTEND_URL` | Allowed CORS origin(s), comma-separated. The first one is used in email links |
| `FIREBASE_PROJECT_ID` | Firebase project used to verify Google ID tokens |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` | SMTP settings (Gmail app password) |

**frontend/.env**: `VITE_API_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`

## Deployment

1. **Neon:** create the database and copy the pooled and direct connection strings.
2. **Render (backend):** create a Web Service with root directory `backend`.
   - Build command: `npm install && npm run build && npm run db:migrate`
   - Start command: `npm start`
   - Add every backend env var, and set `FRONTEND_URL` to your Vercel URL.
3. **Vercel (frontend):** import the repo with root directory `frontend` and the Vite preset. Set `VITE_API_URL=https://<render-app>.onrender.com/api` and the Firebase vars. `vercel.json` already handles SPA routing.
4. **Firebase:** add your Vercel domain under *Authentication → Settings → Authorized domains*, and enable the Google provider.

## Troubleshooting

**`Can't reach database server at ...neon.tech`**: your network's DNS server is refusing `neon.tech` (common on some ISP and office networks). Either set `DNS_SERVERS="1.1.1.1,8.8.8.8"` in `backend/.env`, or switch your OS DNS to a public resolver. TLS still verifies Neon's certificate against the real hostname.

## API overview

All routes are prefixed with `/api`. Every route except `/auth/*` and `/health` needs a `Bearer` token.

| Resource | Endpoints |
| --- | --- |
| Auth | `POST /auth/signup` `/auth/login` `/auth/google` `/auth/forgot-password` `/auth/reset-password` · `GET/PATCH /auth/me` · `POST /auth/change-password` |
| Customers / Staff | `GET POST /customers`, `GET PUT DELETE /customers/:id` · `GET POST /staff`, `PUT /staff/:id` (admin) |
| Catalog | CRUD on `/products`, `/plans`, `/taxes`, `/discounts` (admin writes), `/templates` |
| Subscriptions | CRUD on `/subscriptions` · `POST /subscriptions/:id/{send,confirm,activate,pause,resume,renew,close,cancel,invoice}` |
| Invoices | `GET /invoices`, `GET /invoices/:id` · `POST /invoices/generate` · `POST /invoices/:id/{confirm,cancel,send,payments,pay}` |
| Payments | `GET /payments` |
| Reports | `GET /reports/dashboard` · `GET /reports/summary?from&to` · `GET /reports/export?from&to` (CSV) |

List endpoints accept `page`, `pageSize`, `search` and `status`, and return `{ data, total, page, pageSize }`. Lists are paginated on the server and backed by database indexes, so pages stay fast with thousands of records.

## Business rules at a glance

- **Price of a period** = plan fee + Σ(quantity × unit price). Unit prices are suggested from the product's monthly list price (plus variant extra), scaled to the plan's billing period, and can be edited per quotation.
- **Taxes** come from each product's default tax rules and are calculated per line after discounts.
- **Discounts:** only the single best eligible discount is applied per invoice, and its usage count increases atomically.
- **Lifecycle guards:** each line's quantity must meet the plan's minimum; the start date must fall within the plan's availability window; pause, early-close and renew follow the plan's rules; expired quotations can't be accepted.
- **Billing:** the first period starts on the start date. Paused subscriptions aren't billed for paused periods. Billing stops at the expiry date, and plans with auto-close are closed automatically.
