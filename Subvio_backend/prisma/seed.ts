import bcrypt from 'bcryptjs';
import type { BillingPeriod, PaymentMethod, SubscriptionStatus } from '@prisma/client';
import { prisma, nextNumber } from '../src/lib/prisma';
import { addDays, addMonths, today } from '../src/lib/dates';
import { billNextPeriod, recordPayment } from '../src/services/billing';

const T = today();
const ymd = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

const people: [string, string, string, string][] = [
  ['Aarav Sharma', 'Sharma Textiles', 'Jaipur, Rajasthan', '08'],
  ['Priya Nair', 'Nair Spices Pvt Ltd', 'Kochi, Kerala', '32'],
  ['Rohan Mehta', 'Mehta Diamonds', 'Surat, Gujarat', '24'],
  ['Ananya Iyer', 'Iyer Legal Associates', 'Chennai, Tamil Nadu', '33'],
  ['Vikram Singh', 'Singh Logistics', 'Ludhiana, Punjab', '03'],
  ['Kavya Reddy', 'Reddy Pharma', 'Hyderabad, Telangana', '36'],
  ['Arjun Patel', 'Patel Agro Foods', 'Ahmedabad, Gujarat', '24'],
  ['Sneha Kulkarni', 'Kulkarni Design Studio', 'Pune, Maharashtra', '27'],
  ['Rahul Verma', 'Verma Electronics', 'Lucknow, Uttar Pradesh', '09'],
  ['Meera Krishnan', 'Krishnan Healthcare', 'Bengaluru, Karnataka', '29'],
  ['Aditya Joshi', 'Joshi Automobiles', 'Nashik, Maharashtra', '27'],
  ['Divya Menon', 'Menon Tours & Travels', 'Thiruvananthapuram, Kerala', '32'],
  ['Karan Malhotra', 'Malhotra Fashion House', 'New Delhi, Delhi', '07'],
  ['Pooja Gupta', 'Gupta Sweets', 'Kanpur, Uttar Pradesh', '09'],
  ['Siddharth Rao', 'Rao Constructions', 'Visakhapatnam, Andhra Pradesh', '37'],
  ['Neha Agarwal', 'Agarwal Jewellers', 'Kolkata, West Bengal', '19'],
  ['Manish Choudhary', 'Choudhary Transport', 'Jodhpur, Rajasthan', '08'],
  ['Ishita Banerjee', 'Banerjee Publications', 'Kolkata, West Bengal', '19'],
  ['Nikhil Deshmukh', 'Deshmukh Dairy', 'Nagpur, Maharashtra', '27'],
  ['Lakshmi Pillai', 'Pillai Ayurveda', 'Kozhikode, Kerala', '32'],
  ['Harsh Vardhan', 'Vardhan Infotech', 'Noida, Uttar Pradesh', '09'],
  ['Riya Kapoor', 'Kapoor Interiors', 'Chandigarh, Punjab', '04'],
  ['Suresh Gowda', 'Gowda Coffee Estates', 'Chikmagalur, Karnataka', '29'],
  ['Tanvi Shah', 'Shah Chemicals', 'Vadodara, Gujarat', '24'],
  ['Abhishek Mishra', 'Mishra Education Hub', 'Patna, Bihar', '10'],
  ['Fatima Sheikh', 'Sheikh Leather Works', 'Bhopal, Madhya Pradesh', '23'],
];

function gstin(state: string, i: number) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const pan = `${letters[i % 24]}${letters[(i * 7) % 24]}${letters[(i * 3) % 24]}PK${String(1000 + i * 37).slice(-4)}${letters[(i * 5) % 24]}`;
  return `${state}${pan}1Z${(i % 9) + 1}`;
}

async function reset() {
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionLine.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.templateLine.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.counter.deleteMany();
}

async function main() {
  console.log('Resetting database…');
  await reset();

  /* Users */
  const hash = (p: string) => bcrypt.hash(p, 10);
  await prisma.user.create({ data: { name: 'Kaviya Sudhan', email: 'admin@subvio.com', role: 'ADMIN', passwordHash: await hash('Admin@1234'), phone: '+91 98400 12345' } });
  await prisma.user.create({ data: { name: 'Deepak Raman', email: 'staff@subvio.com', role: 'STAFF', passwordHash: await hash('Staff@1234'), phone: '+91 98450 67890' } });
  await prisma.user.create({ data: { name: 'Anjali Desai', email: 'anjali.desai@subvio.com', role: 'STAFF', passwordHash: await hash('Staff@1234'), isActive: false } });

  const customerPassword = await hash('Customer@1234');
  const customers = [];
  for (const [i, [name, company, address, state]] of people.entries()) {
    const email = i === 0 ? 'customer@subvio.com' : `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@${company.split(' ')[0].toLowerCase()}.in`;
    customers.push(
      await prisma.user.create({
        data: {
          name, email, company, address, role: 'CUSTOMER', gstin: gstin(state, i),
          phone: `+91 9${String(812345670 + i * 104729).slice(0, 4)} ${String(100000 + i * 7919).slice(-5)}`,
          passwordHash: customerPassword,
          createdAt: addDays(T, -170 + i * 6),
        },
      }),
    );
  }

  /* Taxes */
  const [cgst, sgst] = await Promise.all([
    prisma.tax.create({ data: { name: 'CGST 9%', rate: 9, description: 'Central GST for intra-state supply' } }),
    prisma.tax.create({ data: { name: 'SGST 9%', rate: 9, description: 'State GST for intra-state supply' } }),
    prisma.tax.create({ data: { name: 'IGST 18%', rate: 18, description: 'Integrated GST for inter-state supply' } }),
  ]);
  const gst = { connect: [{ id: cgst.id }, { id: sgst.id }] };

  /* Products */
  const productData: [string, 'SERVICE' | 'GOODS', number, number, string, [string, string, number][]][] = [
    ['Brightloop CRM', 'SERVICE', 1200, 300, 'Sales pipeline, leads and contacts. Priced per user.', [['Brand', 'Brightloop', 0], ['Brand', 'Odoo', 560]]],
    ['Brightloop Accounting', 'SERVICE', 1500, 400, 'GST-ready invoicing, ledgers and bank reconciliation.', [['Edition', 'Standard', 0], ['Edition', 'Premium', 800]]],
    ['Brightloop HRMS', 'SERVICE', 950, 250, 'Payroll, attendance and leave management.', []],
    ['Inventory Manager', 'SERVICE', 1100, 280, 'Multi-warehouse stock tracking and reorder rules.', []],
    ['Helpdesk Pro', 'SERVICE', 700, 150, 'Omnichannel ticketing with SLA tracking.', []],
    ['Marketing Automation', 'SERVICE', 1800, 500, 'Email campaigns, journeys and lead scoring.', [['Tier', 'Growth', 0], ['Tier', 'Scale', 1200]]],
    ['Cloud Storage 100 GB', 'SERVICE', 250, 60, 'Add-on: extra document storage.', []],
    ['Advanced Analytics', 'SERVICE', 900, 200, 'Add-on: custom dashboards and scheduled reports.', []],
    ['Priority Support', 'SERVICE', 600, 250, 'Add-on: 24×7 phone support with 1-hour response.', []],
    ['WhatsApp Integration', 'SERVICE', 400, 90, 'Add-on: WhatsApp Business messaging.', []],
    ['POS Terminal Rental', 'GOODS', 2000, 1200, 'Android POS terminal with printer, rented monthly.', []],
  ];
  const products = [];
  for (const [name, type, salesPrice, costPrice, description, variants] of productData) {
    products.push(
      await prisma.product.create({
        data: {
          name, type, salesPrice, costPrice, description, taxes: gst,
          variants: { create: variants.map(([attribute, value, extraPrice]) => ({ attribute, value, extraPrice })) },
        },
        include: { variants: true },
      }),
    );
  }
  const P = Object.fromEntries(products.map((p) => [p.name, p]));

  /* Plans */
  const planData: { name: string; price: number; billingPeriod: BillingPeriod; minQuantity: number; autoClose: boolean; closable: boolean; pausable: boolean; renewable: boolean; description: string; startDate?: Date; endDate?: Date }[] = [
    { name: 'Starter Monthly', price: 499, billingPeriod: 'MONTHLY', minQuantity: 1, autoClose: false, closable: true, pausable: true, renewable: true, description: 'For small shops getting started. Includes onboarding.' },
    { name: 'Business Monthly', price: 0, billingPeriod: 'MONTHLY', minQuantity: 3, autoClose: false, closable: true, pausable: true, renewable: true, description: 'Flexible monthly billing for growing teams.' },
    { name: 'Business Yearly', price: 0, billingPeriod: 'YEARLY', minQuantity: 3, autoClose: true, closable: false, pausable: false, renewable: true, description: 'Annual contract, billed yearly. Closes automatically at expiry.' },
    { name: 'Enterprise Yearly', price: 9999, billingPeriod: 'YEARLY', minQuantity: 10, autoClose: false, closable: false, pausable: false, renewable: true, description: 'Annual enterprise contract with platform fee and dedicated manager.' },
    { name: 'Weekly Flex', price: 0, billingPeriod: 'WEEKLY', minQuantity: 1, autoClose: false, closable: true, pausable: true, renewable: true, description: 'Short-term weekly access for seasonal businesses.' },
    { name: 'Festive Event Pass', price: 99, billingPeriod: 'DAILY', minQuantity: 1, autoClose: true, closable: true, pausable: false, renewable: false, description: 'Daily POS access during the festive season.', startDate: ymd(2026, 10, 1), endDate: ymd(2026, 12, 31) },
  ];
  const plans = await Promise.all(planData.map((data) => prisma.plan.create({ data })));
  const PL = Object.fromEntries(plans.map((p) => [p.name, p]));

  /* Discounts */
  await prisma.discount.createMany({
    data: [
      { name: 'Volume 10+ seats', type: 'PERCENTAGE', value: 10, scope: 'SUBSCRIPTION', minQuantity: 10 },
      { name: 'Diwali Festive Offer', type: 'PERCENTAGE', value: 15, scope: 'SUBSCRIPTION', minPurchase: 5000, maxDiscount: 3000, startDate: ymd(2026, 10, 15), endDate: ymd(2026, 11, 15), usageLimit: 40 },
      { name: 'Big Basket ₹2,000 off', type: 'FIXED', value: 2000, scope: 'SUBSCRIPTION', minPurchase: 25000 },
      { name: 'Monsoon Sale', type: 'PERCENTAGE', value: 20, scope: 'SUBSCRIPTION', startDate: ymd(2026, 6, 1), endDate: ymd(2026, 8, 31), usageLimit: 100 },
      { name: 'Partner Referral 5%', type: 'PERCENTAGE', value: 5, scope: 'SUBSCRIPTION', isActive: false },
    ],
  });
  await prisma.discount.create({
    data: { name: 'CRM Launch ₹500 off', type: 'FIXED', value: 500, scope: 'PRODUCTS', minQuantity: 3, usageLimit: 25, products: { connect: [{ id: P['Brightloop CRM'].id }] } },
  });

  /* Quotation templates */
  const templates: [string, number, string, [string, number][]][] = [
    ['CRM Starter Pack', 15, 'Starter Monthly', [['Brightloop CRM', 1], ['Cloud Storage 100 GB', 1]]],
    ['Growth Bundle', 30, 'Business Monthly', [['Brightloop CRM', 5], ['Helpdesk Pro', 5]]],
    ['Annual Business Suite', 30, 'Business Yearly', [['Brightloop Accounting', 5], ['Brightloop HRMS', 5], ['Advanced Analytics', 5]]],
    ['Enterprise Rollout', 45, 'Enterprise Yearly', [['Brightloop CRM', 25], ['Brightloop HRMS', 25], ['Priority Support', 25]]],
    ['Retail POS Kit', 7, 'Weekly Flex', [['POS Terminal Rental', 1], ['Inventory Manager', 1]]],
  ];
  for (const [name, validityDays, plan, lines] of templates) {
    await prisma.quotationTemplate.create({
      data: { name, validityDays, planId: PL[plan].id, lines: { create: lines.map(([p, quantity]) => ({ productId: P[p].id, quantity })) } },
    });
  }

  /* Subscriptions */
  type Spec = { c: number; plan: string; status: SubscriptionStatus; monthsAgo: number; lines: [string, number, string?][]; terms?: number; expiryMonths?: number };
  const specs: Spec[] = [
    { c: 0, plan: 'Business Monthly', status: 'ACTIVE', monthsAgo: 4, lines: [['Brightloop CRM', 5, 'Odoo'], ['Helpdesk Pro', 5]], expiryMonths: 12 },
    { c: 0, plan: 'Starter Monthly', status: 'ACTIVE', monthsAgo: 2, lines: [['Cloud Storage 100 GB', 2]] },
    { c: 0, plan: 'Business Yearly', status: 'QUOTATION', monthsAgo: -1, lines: [['Brightloop Accounting', 5, 'Premium'], ['Brightloop HRMS', 5]], expiryMonths: 12 },
    { c: 1, plan: 'Starter Monthly', status: 'ACTIVE', monthsAgo: 5, lines: [['Brightloop CRM', 1], ['WhatsApp Integration', 1]] },
    { c: 2, plan: 'Business Yearly', status: 'ACTIVE', monthsAgo: 11, lines: [['Brightloop Accounting', 5], ['Advanced Analytics', 5]], expiryMonths: 12 },
    { c: 3, plan: 'Business Monthly', status: 'ACTIVE', monthsAgo: 3, lines: [['Brightloop HRMS', 8], ['Brightloop CRM', 4]], terms: 30 },
    { c: 4, plan: 'Enterprise Yearly', status: 'ACTIVE', monthsAgo: 7, lines: [['Brightloop CRM', 30], ['Inventory Manager', 30], ['Priority Support', 30]], terms: 30, expiryMonths: 12 },
    { c: 5, plan: 'Business Monthly', status: 'ACTIVE', monthsAgo: 5, lines: [['Marketing Automation', 3, 'Scale'], ['Advanced Analytics', 3]] },
    { c: 6, plan: 'Starter Monthly', status: 'ACTIVE', monthsAgo: 4, lines: [['Inventory Manager', 1], ['POS Terminal Rental', 2]] },
    { c: 7, plan: 'Business Monthly', status: 'ACTIVE', monthsAgo: 2, lines: [['Brightloop CRM', 3], ['Marketing Automation', 3]] },
    { c: 8, plan: 'Starter Monthly', status: 'ACTIVE', monthsAgo: 3, lines: [['Helpdesk Pro', 2]] },
    { c: 9, plan: 'Business Yearly', status: 'ACTIVE', monthsAgo: 4, lines: [['Brightloop HRMS', 12], ['Brightloop Accounting', 4, 'Standard']], expiryMonths: 12 },
    { c: 10, plan: 'Business Monthly', status: 'ACTIVE', monthsAgo: 5, lines: [['Inventory Manager', 4], ['Brightloop Accounting', 3]], terms: 30 },
    { c: 11, plan: 'Weekly Flex', status: 'ACTIVE', monthsAgo: 1, lines: [['POS Terminal Rental', 1], ['Inventory Manager', 1]], terms: 7 },
    { c: 12, plan: 'Business Monthly', status: 'ACTIVE', monthsAgo: 4, lines: [['Marketing Automation', 4, 'Growth'], ['WhatsApp Integration', 4]] },
    { c: 13, plan: 'Starter Monthly', status: 'ACTIVE', monthsAgo: 1, lines: [['Brightloop Accounting', 1]] },
    { c: 14, plan: 'Business Monthly', status: 'ACTIVE', monthsAgo: 3, lines: [['Brightloop CRM', 10, 'Brightloop'], ['Helpdesk Pro', 10]] },
    { c: 15, plan: 'Business Yearly', status: 'ACTIVE', monthsAgo: 11, lines: [['Brightloop CRM', 6], ['Cloud Storage 100 GB', 6]], expiryMonths: 12 },
    { c: 16, plan: 'Starter Monthly', status: 'ACTIVE', monthsAgo: 2, lines: [['Brightloop HRMS', 1]] },
    { c: 17, plan: 'Business Monthly', status: 'ACTIVE', monthsAgo: 4, lines: [['Brightloop Accounting', 3, 'Premium'], ['Advanced Analytics', 3]], terms: 30 },
    { c: 18, plan: 'Starter Monthly', status: 'PAUSED', monthsAgo: 4, lines: [['Inventory Manager', 1]] },
    { c: 19, plan: 'Business Monthly', status: 'PAUSED', monthsAgo: 3, lines: [['Helpdesk Pro', 3], ['WhatsApp Integration', 3]] },
    { c: 20, plan: 'Starter Monthly', status: 'CLOSED', monthsAgo: 5, lines: [['Brightloop CRM', 1]] },
    { c: 21, plan: 'Business Monthly', status: 'CLOSED', monthsAgo: 4, lines: [['Marketing Automation', 3]] },
    { c: 22, plan: 'Business Monthly', status: 'QUOTATION', monthsAgo: -1, lines: [['Brightloop CRM', 5], ['Helpdesk Pro', 5]] },
    { c: 23, plan: 'Enterprise Yearly', status: 'QUOTATION', monthsAgo: 0, lines: [['Brightloop CRM', 25], ['Brightloop HRMS', 25]], expiryMonths: 12 },
    { c: 24, plan: 'Starter Monthly', status: 'CONFIRMED', monthsAgo: -1, lines: [['Helpdesk Pro', 1]] },
    { c: 25, plan: 'Business Yearly', status: 'CONFIRMED', monthsAgo: -1, lines: [['Brightloop HRMS', 5]], expiryMonths: 12 },
    { c: 13, plan: 'Business Monthly', status: 'DRAFT', monthsAgo: -1, lines: [['Brightloop CRM', 3], ['Advanced Analytics', 3]] },
    { c: 5, plan: 'Weekly Flex', status: 'DRAFT', monthsAgo: 0, lines: [['POS Terminal Rental', 1]] },
    { c: 8, plan: 'Business Monthly', status: 'CANCELLED', monthsAgo: 1, lines: [['Inventory Manager', 3]] },
  ];

  const methods: PaymentMethod[] = ['BANK_TRANSFER', 'UPI', 'CARD', 'ONLINE', 'CHEQUE', 'CASH'];
  let paymentIndex = 0;

  for (const [i, s] of specs.entries()) {
    const plan = PL[s.plan];
    const startDate = addMonths(addDays(T, -((i * 5) % 20)), -s.monthsAgo);
    const yearly = plan.billingPeriod === 'YEARLY';
    const sub = await prisma.subscription.create({
      data: {
        number: await nextNumber('SUB'),
        customerId: customers[s.c].id,
        planId: plan.id,
        startDate,
        expiryDate: s.expiryMonths ? addDays(addMonths(startDate, s.expiryMonths), -1) : null,
        quotationValidUntil: s.status === 'QUOTATION' ? addDays(T, i % 2 ? 20 : -3) : null,
        paymentTermDays: s.terms ?? 15,
        createdAt: addDays(startDate, -7),
        lines: {
          create: s.lines.map(([name, quantity, variantValue]) => {
            const product = P[name];
            const variant = product.variants.find((v) => v.value === variantValue);
            const monthly = Number(product.salesPrice) + Number(variant?.extraPrice ?? 0);
            return { productId: product.id, variantId: variant?.id ?? null, quantity, unitPrice: yearly ? monthly * 10 : monthly };
          }),
        },
      },
    });

    if (!['ACTIVE', 'PAUSED', 'CLOSED'].includes(s.status)) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: s.status } });
      continue;
    }

    // Activate and bill every period up to today using the real billing engine.
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'ACTIVE', nextInvoiceDate: startDate } });
    const stopAt = s.status === 'ACTIVE' ? T : addMonths(T, -1);
    while (await billNextPeriod(sub.id, stopAt));

    if (s.status !== 'ACTIVE') {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: s.status === 'CLOSED' ? { status: 'CLOSED', closedAt: addDays(T, -10 - i), nextInvoiceDate: null } : { status: 'PAUSED' },
      });
    }

    // Backdate invoices to their billing period and settle most of them.
    const invoices = await prisma.invoice.findMany({ where: { subscriptionId: sub.id }, orderBy: { periodStart: 'asc' } });
    for (const [k, inv] of invoices.entries()) {
      const issueDate = inv.periodStart;
      const dueDate = addDays(issueDate, sub.paymentTermDays);
      const recent = addDays(issueDate, 5) > T;
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { issueDate, dueDate, status: recent && i % 2 === 0 ? 'DRAFT' : 'CONFIRMED', sentAt: recent ? null : issueDate },
      });
      if (recent && i % 2 === 0) continue;
      const isLast = k === invoices.length - 1;
      const shouldPay = dueDate < T ? !(isLast && i % 3 === 0) : i % 3 === 1;
      if (shouldPay) {
        const payDate = addDays(issueDate, Math.min(sub.paymentTermDays, 2 + ((i + k) % 10)));
        await recordPayment(inv.id, {
          method: methods[paymentIndex++ % methods.length],
          amount: Number(inv.total),
          date: payDate > T ? T : payDate,
          note: k % 4 === 0 ? 'Payment received, thank you' : null,
        });
      }
    }
    process.stdout.write('.');
  }

  const [subs, invoices, payments] = await Promise.all([prisma.subscription.count(), prisma.invoice.count(), prisma.payment.count()]);
  console.log(`\nSeeded ${customers.length} customers, ${products.length} products, ${plans.length} plans, ${subs} subscriptions, ${invoices} invoices, ${payments} payments.`);
  console.log('Logins → admin@subvio.com / Admin@1234 · staff@subvio.com / Staff@1234 · customer@subvio.com / Customer@1234');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

