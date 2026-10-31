import * as m from "@/lib/mock-data";
import { fmt } from "@/lib/mock-data";
import { StatusBadge } from "./StatusBadge";
import type { Column } from "./DataTable";
import type { Role } from "@/lib/auth";

type Row = Record<string, unknown>;
export type Field = { name: string; label: string; type?: "text" | "number" | "date" | "email"; options?: string[] };
export type ModuleConfig = { title: string; subtitle: string; singular: string; data: Row[]; columns: Column<Row>[]; fields: Field[] };

const money = (k: string): Column<Row> => ({ key: k, label: "Amount", align: "right", render: (r) => fmt(Number(r[k])) });
const status: Column<Row> = { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r["status"])} /> };
const id: Column<Row> = { key: "id", label: "ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{String(r["id"])}</span> };
const bold = (k: string, label: string): Column<Row> => ({ key: k, label, render: (r) => <span className="font-medium">{String(r[k])}</span> });
const col = (key: string, label: string): Column<Row> => ({ key, label });
const customerNames = m.customers.map((c) => c.name);
const planNames = m.plans.map((p) => `${p.name} ${p.interval}`);

export const modules: Record<string, ModuleConfig> = {
  customers: {
    title: "Customers", subtitle: "Accounts billed through Subscribo", singular: "Customer", data: m.customers,
    columns: [id, bold("name", "Company"), col("contact", "Contact"), col("email", "Email"), col("joined", "Joined"), status],
    fields: [{ name: "name", label: "Company" }, { name: "contact", label: "Contact person" }, { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Phone" }],
  },
  products: {
    title: "Products", subtitle: "Everything you can sell", singular: "Product", data: m.products,
    columns: [id, bold("name", "Product"), col("category", "Category"), { ...money("price"), label: "Price" }, status],
    fields: [{ name: "name", label: "Product name" }, { name: "category", label: "Category", options: ["Software", "Add-on", "Service"] }, { name: "price", label: "Price (USD)", type: "number" }],
  },
  plans: {
    title: "Plans", subtitle: "Pricing plans and billing intervals", singular: "Plan", data: m.plans,
    columns: [id, bold("name", "Plan"), col("interval", "Interval"), { ...money("price"), label: "Price" }, { key: "subscribers", label: "Subscribers", align: "right" }, status],
    fields: [{ name: "name", label: "Plan name" }, { name: "interval", label: "Interval", options: ["Monthly", "Annual"] }, { name: "price", label: "Price (USD)", type: "number" }],
  },
  quotations: {
    title: "Quotations", subtitle: "Proposals sent to prospects and customers", singular: "Quotation", data: m.quotations,
    columns: [id, bold("customer", "Customer"), col("plan", "Plan"), money("amount"), col("validUntil", "Valid until"), status],
    fields: [{ name: "customer", label: "Customer", options: customerNames }, { name: "plan", label: "Plan", options: planNames }, { name: "amount", label: "Amount (USD)", type: "number" }, { name: "validUntil", label: "Valid until", type: "date" }],
  },
  subscriptions: {
    title: "Subscriptions", subtitle: "Recurring agreements and renewals", singular: "Subscription", data: m.subscriptions,
    columns: [id, bold("customer", "Customer"), col("plan", "Plan"), money("amount"), col("nextBilling", "Next billing"), status],
    fields: [{ name: "customer", label: "Customer", options: customerNames }, { name: "plan", label: "Plan", options: planNames }, { name: "amount", label: "Amount (USD)", type: "number" }, { name: "start", label: "Start date", type: "date" }],
  },
  invoices: {
    title: "Invoices", subtitle: "Issued, pending and overdue invoices", singular: "Invoice", data: m.invoices,
    columns: [id, bold("customer", "Customer"), money("amount"), col("issued", "Issued"), col("due", "Due"), status],
    fields: [{ name: "customer", label: "Customer", options: customerNames }, { name: "amount", label: "Amount (USD)", type: "number" }, { name: "due", label: "Due date", type: "date" }],
  },
  payments: {
    title: "Payments", subtitle: "Collected and failed payments", singular: "Payment", data: m.payments,
    columns: [id, col("invoice", "Invoice"), bold("customer", "Customer"), money("amount"), col("method", "Method"), col("date", "Date"), status],
    fields: [{ name: "invoice", label: "Invoice ID" }, { name: "customer", label: "Customer", options: customerNames }, { name: "amount", label: "Amount (USD)", type: "number" }, { name: "method", label: "Method", options: ["Card", "Bank Transfer", "UPI", "PayPal"] }],
  },
  discounts: {
    title: "Discounts", subtitle: "Coupons and promotional offers", singular: "Discount", data: m.discounts,
    columns: [id, { key: "code", label: "Code", render: (r) => <span className="rounded bg-accent px-2 py-0.5 font-mono text-xs text-accent-foreground">{String(r["code"])}</span> }, col("type", "Type"), col("value", "Value"), { key: "uses", label: "Uses", align: "right" }, col("expires", "Expires"), status],
    fields: [{ name: "code", label: "Code" }, { name: "type", label: "Type", options: ["Percentage", "Fixed", "Free months"] }, { name: "value", label: "Value" }, { name: "expires", label: "Expires", type: "date" }],
  },
  taxes: {
    title: "Taxes", subtitle: "Tax rates applied to invoices", singular: "Tax rate", data: m.taxes,
    columns: [id, bold("name", "Name"), col("region", "Region"), col("rate", "Rate"), status],
    fields: [{ name: "name", label: "Name" }, { name: "region", label: "Region code" }, { name: "rate", label: "Rate (e.g. 18%)" }],
  },
  staff: {
    title: "Staff Management", subtitle: "Team members and access", singular: "Staff member", data: m.staff,
    columns: [id, bold("name", "Name"), col("email", "Email"), col("role", "Role"), col("lastActive", "Last active"), status],
    fields: [{ name: "name", label: "Full name" }, { name: "email", label: "Email", type: "email" }, { name: "role", label: "Role", options: ["Admin", "Staff"] }],
  },
};

export const allowedModules: Record<Role, string[]> = {
  admin: ["customers", "products", "plans", "quotations", "subscriptions", "invoices", "payments", "discounts", "taxes", "staff", "reports", "settings"],
  staff: ["customers", "quotations", "subscriptions", "invoices", "payments", "settings"],
  customer: ["plans", "subscriptions", "invoices", "payments", "profile"],
};
