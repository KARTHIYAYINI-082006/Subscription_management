// Realistic mock data. Replace with API calls via src/services/* when the Node/Express backend is ready.
export type Status = string;

const names = [
  "Acme Corp", "Northwind Traders", "Globex Ltd", "Initech", "Umbrella Health", "Stark Industries",
  "Wayne Logistics", "Hooli Cloud", "Pied Piper", "Soylent Foods", "Vandelay Imports", "Cyberdyne Labs",
];
const people = ["Aarav Mehta", "Priya Sharma", "Liam Carter", "Sofia Rossi", "Kenji Tanaka", "Emma Wilson", "Noah Patel", "Ava Johnson"];
const plansList = ["Starter Monthly", "Growth Monthly", "Pro Annual", "Enterprise Annual", "Growth Annual"];
const pick = <T,>(a: T[], i: number) => a[i % a.length] as T;
const date = (offset: number) => {
  const d = new Date(2026, 9, 31);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const customers = names.map((n, i) => ({
  id: `CUS-${1001 + i}`,
  name: n,
  contact: pick(people, i),
  email: `billing@${n.toLowerCase().replace(/[^a-z]/g, "")}.com`,
  phone: `+1 555 01${(10 + i).toString()}`,
  status: i % 5 === 4 ? "Inactive" : "Active",
  joined: date(-400 + i * 25),
}));

export const products = [
  { id: "PRD-01", name: "Subscribo Billing", category: "Software", price: 49, status: "Active" },
  { id: "PRD-02", name: "Analytics Add-on", category: "Add-on", price: 19, status: "Active" },
  { id: "PRD-03", name: "Priority Support", category: "Service", price: 99, status: "Active" },
  { id: "PRD-04", name: "Extra Seats (5)", category: "Add-on", price: 25, status: "Active" },
  { id: "PRD-05", name: "Legacy Invoicing", category: "Software", price: 29, status: "Archived" },
];

export const plans = [
  { id: "PLN-01", name: "Starter", interval: "Monthly", price: 29, subscribers: 412, status: "Active", features: ["Up to 100 customers", "Basic invoicing", "Email support"] },
  { id: "PLN-02", name: "Growth", interval: "Monthly", price: 79, subscribers: 268, status: "Active", features: ["Up to 1,000 customers", "Automated dunning", "Analytics dashboard"] },
  { id: "PLN-03", name: "Pro", interval: "Annual", price: 790, subscribers: 134, status: "Active", features: ["Unlimited customers", "Multi-currency", "Priority support"] },
  { id: "PLN-04", name: "Enterprise", interval: "Annual", price: 2490, subscribers: 38, status: "Active", features: ["Dedicated manager", "Custom SLAs", "SSO & audit logs"] },
];

export const subscriptions = names.map((n, i) => ({
  id: `SUB-${2001 + i}`,
  customer: n,
  plan: pick(plansList, i),
  amount: pick([29, 79, 790, 2490, 790], i),
  start: date(-300 + i * 20),
  nextBilling: date(2 + i * 3),
  status: pick(["Active", "Active", "Trial", "Active", "Paused", "Active", "Cancelled"], i),
}));

export const invoices = Array.from({ length: 16 }, (_, i) => ({
  id: `INV-${3040 + i}`,
  customer: pick(names, i),
  amount: pick([29, 79, 790, 2490, 158, 237], i),
  issued: date(-40 + i * 2),
  due: date(-25 + i * 2),
  status: pick(["Paid", "Paid", "Pending", "Overdue", "Paid", "Draft"], i),
}));

export const payments = Array.from({ length: 14 }, (_, i) => ({
  id: `PAY-${5100 + i}`,
  invoice: `INV-${3040 + i}`,
  customer: pick(names, i),
  amount: pick([29, 79, 790, 2490, 158], i),
  method: pick(["Card", "Bank Transfer", "UPI", "Card", "PayPal"], i),
  date: date(-30 + i * 2),
  status: i % 7 === 3 ? "Failed" : i % 9 === 5 ? "Refunded" : "Succeeded",
}));

export const quotations = Array.from({ length: 9 }, (_, i) => ({
  id: `QT-${7001 + i}`,
  customer: pick(names, i + 3),
  plan: pick(plansList, i + 1),
  amount: pick([790, 2490, 79, 1580, 29], i),
  validUntil: date(5 + i * 4),
  status: pick(["Sent", "Accepted", "Draft", "Rejected", "Sent"], i),
}));

export const discounts = [
  { id: "DSC-01", code: "WELCOME20", type: "Percentage", value: "20%", uses: 142, expires: date(60), status: "Active" },
  { id: "DSC-02", code: "ANNUAL2M", type: "Free months", value: "2 months", uses: 58, expires: date(120), status: "Active" },
  { id: "DSC-03", code: "FLAT50", type: "Fixed", value: "$50", uses: 23, expires: date(-5), status: "Expired" },
];

export const taxes = [
  { id: "TAX-01", name: "GST India", region: "IN", rate: "18%", status: "Active" },
  { id: "TAX-02", name: "VAT UK", region: "GB", rate: "20%", status: "Active" },
  { id: "TAX-03", name: "Sales Tax CA", region: "US-CA", rate: "7.25%", status: "Active" },
  { id: "TAX-04", name: "VAT Germany", region: "DE", rate: "19%", status: "Inactive" },
];

export const staff = people.slice(0, 6).map((p, i) => ({
  id: `STF-${10 + i}`,
  name: p,
  email: `${p.split(" ")[0]!.toLowerCase()}@subscribo.io`,
  role: i === 0 ? "Admin" : "Staff",
  lastActive: date(-i),
  status: i === 5 ? "Invited" : "Active",
}));

export const revenueByMonth = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"].map((m, i) => ({
  month: m,
  mrr: Math.round(42000 + i * 3100 + Math.sin(i) * 1800),
  revenue: Math.round(48000 + i * 3600 + Math.cos(i) * 2600),
}));

export const subscriptionStats = [
  { name: "Active", value: 812 },
  { name: "Trial", value: 96 },
  { name: "Paused", value: 41 },
  { name: "Cancelled", value: 63 },
];

export const kpis = {
  totalCustomers: 1284,
  activeSubscriptions: 812,
  mrr: 77450,
  totalRevenue: 1_284_300,
  outstanding: 18640,
  overdue: 27,
};

// The demo customer account is "Acme Corp"
export const CURRENT_CUSTOMER = "Acme Corp";

export const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
