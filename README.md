# Subvio – Subscription Management System

**Subscriptions, simplified. Growth, amplified.**

Subvio is a web application that helps a business sell and manage **subscriptions**: things customers pay for again and again, such as a monthly software plan.

It handles the whole journey in one place: create a quotation, let the customer accept it, start the subscription, send invoices automatically every billing period, collect payments, and see how much revenue the business is making.

Built for the *Brightloop Software* problem statement.

---

## Contents

1. [Who uses Subvio](#1-who-uses-subvio)
2. [How it works](#2-how-it-works)
3. [How an invoice is calculated](#3-how-an-invoice-is-calculated)
4. [Pages in the app](#4-pages-in-the-app)
5. [Logging in and signing up](#5-logging-in-and-signing-up)
6. [Emails the app sends](#6-emails-the-app-sends)
7. [Tech stack](#7-tech-stack)
8. [Project structure](#8-project-structure)
9. [Run it on your computer](#9-run-it-on-your-computer)
10. [Deploy it online](#10-deploy-it-online)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Who uses Subvio

There are three types of users. Each one sees a different version of the app.

| Role | Who they are | What they can do |
| --- | --- | --- |
| **Admin** | Business owner | Everything. Also the only one who can add or edit products, plans, taxes and discounts, and approve staff accounts. |
| **Staff** | Sales and billing team | Manage customers, create quotations and subscriptions, create and send invoices, record payments, and view reports. |
| **Customer** | The person who buys | See **only their own** subscriptions and invoices, accept or decline quotations, and pay invoices online. |

---

## 2. How it works

### Step 1: The admin sets up what to sell

| Item | Example |
| --- | --- |
| **Product** | *Brightloop CRM*, ₹1,200 per user. A product can have options (variants), such as *Brand: Odoo* for ₹560 extra. |
| **Plan** | *Business Monthly*: billed every month, minimum 3 users. A plan decides how often the customer is billed (daily, weekly, monthly or yearly) and whether the subscription can be paused, renewed or closed early. |
| **Tax** | CGST 9% + SGST 9% (GST), added to each product automatically. |
| **Discount** | *Diwali Offer – 15% off* on orders above ₹5,000, valid for a limited time. |
| **Template** | A ready-made quotation (plan + products) so staff can create one in a single click. |

### Step 2: A subscription goes through these stages

```
 Draft ──► Quotation ──► Confirmed ──► Active ──► Closed
   (staff     (customer      (staff       │  ▲
   sends it)   accepts)      activates)   ▼  │
                  │                     Paused
                  └──► Cancelled (customer declines)
```

1. **Draft:** staff create the subscription for a customer.
2. **Quotation:** staff send it, and the customer gets an email.
3. **Confirmed:** the customer accepts it in their portal (or declines it, which makes it **Cancelled**).
4. **Active:** staff activate it, and billing starts.
5. **Paused / Closed:** an active subscription can be paused, resumed, renewed or closed, if its plan allows it.

Every subscription gets a number such as `SUB-00001`.

### Step 3: Invoices are created automatically

- Every hour, Subvio checks which active subscriptions are due and **creates their invoices automatically** (`INV-00001`, `INV-00002`, …).
- Staff can also click **Create invoice** or **Run billing** to do it right away.
- If billing was missed for a few periods, Subvio catches up and creates one invoice per missed period.
- **A customer is never billed twice for the same period.**

An invoice goes through these stages:

```
 Draft ──► Confirmed ──► Paid
   └──────────┴──► Cancelled (only if nothing has been paid)
```

- Customers can't see **Draft** invoices. They appear once staff confirm them.
- A confirmed invoice past its due date is shown as **Overdue**.

### Step 4: Payments are collected

- **Staff** record payments by cash, UPI, card, bank transfer or cheque. A customer can pay in parts, and the invoice becomes **Paid** automatically when the full amount is received.
- **Customers** can click **Pay now** on their invoice. This is a simulated payment for demonstration; no real money is charged.

### Step 5: Track the business

The **Dashboard** and **Reports** show:
- **MRR** (monthly recurring revenue) and **ARR** (yearly recurring revenue)
- Number of active subscriptions
- Money collected, outstanding and overdue
- Charts of revenue over time, by plan and by product

Reports can be filtered by date and downloaded as a CSV (Excel) file.

---

## 3. How an invoice is calculated

```
Total = (Plan fee + Products) − Best discount + Tax
```

**Example:** a customer on *Business Monthly* buys 5 × Brightloop CRM (Odoo, ₹1,760 each) and 5 × Helpdesk Pro (₹700 each).

| | Amount |
| --- | --- |
| Products: (5 × ₹1,760) + (5 × ₹700) | ₹12,300.00 |
| Best discount: Diwali Offer, 15% | − ₹1,845.00 |
| GST 18% on ₹10,455 | + ₹1,881.90 |
| **Total** | **₹12,336.90** |

- Subvio checks every active discount and applies only the **one that saves the customer the most**.
- Tax is calculated **after** the discount.

The app also enforces the plan's rules:
- A plan's minimum quantity must be met. For example, *Business Monthly* needs at least 3 per product.
- Expired quotations can't be accepted.
- A plan that doesn't allow pausing or early closing blocks those actions.

---

## 4. Pages in the app

| Page | What it shows | Admin | Staff | Customer |
| --- | --- | :-: | :-: | :-: |
| **Dashboard** | Key numbers and charts (customers see their own summary) | ✅ | ✅ | ✅ |
| **Subscriptions** | All subscriptions, with actions such as send, activate, pause and close | ✅ | ✅ | Own only |
| **Invoices** | All invoices, with confirm, send, record payment and print/PDF | ✅ | ✅ | Own only |
| **Customers** | Customer list and details | ✅ | ✅ | ❌ |
| **Templates** | Ready-made quotations | ✅ | ✅ | ❌ |
| **Payments** | Every payment received | ✅ | ✅ | ❌ |
| **Reports** | Revenue reports with date filter and CSV download | ✅ | ✅ | ❌ |
| **Products, Plans, Discounts, Taxes** | What the business sells | ✅ Edit | 👁 View | ❌ |
| **Staff** | Team members and approval of new accounts | ✅ | ❌ | ❌ |
| **Profile** | Your details and password | ✅ | ✅ | ✅ |

The app works on phones, tablets and desktops.

---

## 5. Logging in and signing up

### Try the demo

Open the app and use the **Try a demo** buttons on the login form. Each button fills in the account and selects its role.

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@subvio.com | Admin@1234 |
| Staff | staff@subvio.com | Staff@1234 |
| Customer | customer@subvio.com | Customer@1234 |

### Logging in

1. Select your role: **Customer**, **Staff** or **Admin**.
2. Enter your email and password.
3. You get in only if the **email, password and role all match**. For example, a customer account can't log in by selecting *Admin*.

You can also use **Continue with Google**, or **Forgot password?** to receive a reset link by email.

### Signing up

- **Customer:** the account is created and you're logged in right away.
- **Staff or Admin:** the account is created but stays **inactive**. An existing admin must approve it: open **Staff**, click **Edit** on the new member, tick **Account is active** and save. After that, the new member can log in.

**Password rule:** more than 8 characters, with at least one uppercase letter, one lowercase letter and one special character (for example `Kavi@1234`).

---

## 6. Emails the app sends

| When | Who receives it |
| --- | --- |
| Someone clicks **Forgot password** | That user: a reset link, valid for 1 hour |
| Staff add a new customer | The customer: a link to set their password, valid for 72 hours |
| Staff send a quotation | The customer: a **Review quotation** button |
| Staff send an invoice | The customer: invoice details and a **View invoice** button |

Emails are sent through Gmail using Nodemailer (see `EMAIL_*` in [Environment variables](#environment-variables)).

---

## 7. Tech stack

| Part | Technology |
| --- | --- |
| **Frontend** (what users see) | React, TypeScript, Vite, Tailwind CSS, React Query, React Hook Form + Zod, Recharts, Framer Motion |
| **Backend** (server and business rules) | Node.js, Express, TypeScript, Prisma ORM, Zod |
| **Database** | PostgreSQL (hosted on Neon) |
| **Login and security** | JWT tokens, bcrypt password hashing, Google sign-in (Firebase), Helmet, rate limiting |
| **Email** | Nodemailer with Gmail |
| **Hosting** | Vercel (frontend), Render (backend), Neon (database) |

---

## 8. Project structure

```
Subscription_management/
├── Subvio_backend/            Server (API)
│   ├── prisma/
│   │   ├── schema.prisma      Database tables
│   │   ├── migrations/        Database setup scripts
│   │   └── seed.ts            Sample data generator
│   └── src/
│       ├── modules/           Features: auth, users, catalog, subscriptions, invoices, reports
│       ├── services/
│       │   └── billing.ts     Price, discount and tax calculation, invoice creation, payments
│       ├── middleware/        Login check, role check, error handling
│       ├── lib/               Shared helpers (database, email, dates, settings)
│       ├── app.ts             Connects all features together
│       └── index.ts           Starts the server and the hourly billing job
│
├── Subvio_frontend/           Website (user interface)
│   └── src/
│       ├── pages/             One file per page (Dashboard, Subscriptions, Invoices, …)
│       ├── components/        Reusable pieces (tables, forms, charts, layout)
│       ├── context/           Logged-in user information
│       ├── hooks/             Data loading helpers
│       ├── lib/               API connection, constants, Google sign-in
│       └── App.tsx            Page routes and role-based access
│
└── README.md
```

---

## 9. Run it on your computer

**You need:** Node.js 20 or newer, and a PostgreSQL database (a free database from [Neon](https://neon.tech) works).

### Step 1: Start the backend

```bash
cd Subvio_backend
cp .env.example .env      # then open .env and fill in your values (see below)
npm install
npm run db:migrate        # creates the database tables
npm run dev               # server runs at http://localhost:5000
```

To fill an **empty** database with sample data and the 3 demo accounts, run `npm run db:seed`.
> ⚠️ `db:seed` **deletes all existing data** first. Never run it on a database that has real accounts.

### Step 2: Start the frontend

Open a second terminal:

```bash
cd Subvio_frontend
cp .env.example .env      # set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev               # website runs at http://localhost:5173
```

Open **http://localhost:5173** in your browser.

### Environment variables

**`Subvio_backend/.env`**

| Variable | What to put |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string (ends with `?sslmode=verify-full`) |
| `DIRECT_URL` | Neon **direct** connection string, used for creating tables |
| `JWT_SECRET` | Any long random text, used to secure logins |
| `JWT_EXPIRES_IN` | How long a login lasts, e.g. `7d` |
| `FRONTEND_URL` | Website address, e.g. `http://localhost:5173`. Used in email links. |
| `FIREBASE_PROJECT_ID` | Firebase project ID (for Google sign-in) |
| `EMAIL_HOST`, `EMAIL_PORT` | `smtp.gmail.com` and `587` |
| `EMAIL_USER`, `EMAIL_FROM` | Your Gmail address |
| `EMAIL_PASSWORD` | A Gmail **App Password**, not your normal password. Create one at myaccount.google.com/apppasswords (2-Step Verification must be on). |
| `DNS_SERVERS` | Optional. See [Troubleshooting](#11-troubleshooting). |

**`Subvio_frontend/.env`**

| Variable | What to put |
| --- | --- |
| `VITE_API_URL` | Backend address, e.g. `http://localhost:5000/api` |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | From Firebase Console → Project settings → Your apps |

---

## 10. Deploy it online

1. **Database (Neon):** create a database and copy its pooled and direct connection strings.
2. **Backend (Render):** create a *Web Service* with root directory `Subvio_backend`.
   - Build command: `npm install && npm run build && npm run db:migrate`
   - Start command: `npm start`
   - Add all backend environment variables. Set `FRONTEND_URL` to your Vercel website address.
3. **Frontend (Vercel):** import the repository with root directory `Subvio_frontend`.
   - Set `VITE_API_URL` to `https://<your-render-app>.onrender.com/api`, and add the Firebase variables.
4. **Firebase:** turn on the Google sign-in provider, and add your Vercel domain under *Authentication → Settings → Authorized domains*.

---

## 11. Troubleshooting

| Problem | Fix |
| --- | --- |
| `Can't reach database server at ...neon.tech` | Your network is blocking Neon. Add `DNS_SERVERS="1.1.1.1,8.8.8.8"` to `Subvio_backend/.env` and restart the backend. |
| "This account is not registered as …" | You selected the wrong role. Choose the role that matches your account. |
| "Your account is not active yet" | A Staff or Admin sign-up must be approved by an admin on the **Staff** page. |
| Emails are not arriving | Check the spam folder, and make sure `EMAIL_PASSWORD` is a Gmail **App Password**. |
| Google sign-in doesn't work | Check the Firebase variables, and that your website's domain is in Firebase *Authorized domains*. |
| The app shows no data | Make sure the backend is running and `VITE_API_URL` points to it. |
