export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';
export type BillingPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type SubscriptionStatus = 'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'CANCELLED';
type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'CHEQUE' | 'ONLINE';

export interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  phone: string | null;
  company: string | null;
  address: string | null;
  gstin: string | null;
  createdAt: string;
  hasPassword?: boolean;
  _count?: { subscriptions: number };
}

export interface Tax {
  id: string;
  name: string;
  rate: number;
  description: string | null;
}

export interface Variant {
  id: string;
  attribute: string;
  value: string;
  extraPrice: number;
}

export interface Product {
  id: string;
  name: string;
  type: 'SERVICE' | 'GOODS';
  salesPrice: number;
  costPrice: number;
  description: string | null;
  variants: Variant[];
  taxes: Tax[];
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: BillingPeriod;
  minQuantity: number;
  startDate: string | null;
  endDate: string | null;
  autoClose: boolean;
  closable: boolean;
  pausable: boolean;
  renewable: boolean;
  description: string | null;
  _count?: { subscriptions: number };
}

export interface Discount {
  id: string;
  name: string;
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
  scope: 'SUBSCRIPTION' | 'PRODUCTS';
  minPurchase: number;
  minQuantity: number;
  maxDiscount: number | null;
  startDate: string | null;
  endDate: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  products: { id: string; name: string }[];
}

export interface QuotationTemplate {
  id: string;
  name: string;
  validityDays: number;
  planId: string;
  notes: string | null;
  plan: Plan;
  lines: { id: string; productId: string; quantity: number; product: { id: string; name: string; salesPrice: number } }[];
}

interface SubscriptionLine {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  product: Product;
  variant: Variant | null;
}

interface PricedLine {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  amount: number;
}

export interface Subscription {
  id: string;
  number: string;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string | null;
  quotationValidUntil: string | null;
  paymentTermDays: number;
  nextInvoiceDate: string | null;
  closedAt: string | null;
  notes: string | null;
  createdAt: string;
  customerId: string;
  planId: string;
  customer: Pick<User, 'id' | 'name' | 'email'> & Partial<User>;
  plan: Plan;
  recurringTotal?: number;
}

export interface SubscriptionDetail extends Subscription {
  lines: SubscriptionLine[];
  invoices: Pick<Invoice, 'id' | 'number' | 'status' | 'total' | 'issueDate' | 'dueDate' | 'periodStart' | 'periodEnd'>[];
  preview: {
    lines: PricedLine[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    discount: { name: string } | null;
  };
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
  date: string;
  note: string | null;
  invoice?: { id: string; number: string; customer: { name: string } };
}

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discountAmount: number;
  discountName: string | null;
  taxAmount: number;
  total: number;
  amountPaid: number;
  sentAt: string | null;
  customer: Pick<User, 'id' | 'name' | 'email'> & Partial<User>;
  subscription: { id: string; number: string; plan?: { name: string; billingPeriod: BillingPeriod } };
}

export interface InvoiceDetail extends Invoice {
  lines: (PricedLine & { id: string })[];
  payments: Payment[];
}

export interface TrendPoint {
  month: string;
  invoiced: number;
  collected: number;
  newSubscriptions: number;
}

interface Receivables {
  outstandingAmount: number;
  outstandingCount: number;
  overdueAmount: number;
  overdueCount: number;
}

type SubscriptionCard = Subscription & { customer: { name: string }; plan: { name: string } & Plan };

export interface StaffDashboard extends Receivables {
  customers: number;
  activeSubscriptions: number;
  products: number;
  mrr: number;
  arr: number;
  revenueThisMonth: number;
  statusDistribution: { status: SubscriptionStatus; count: number }[];
  trend: TrendPoint[];
  recentSubscriptions: SubscriptionCard[];
  overdueInvoices: Invoice[];
  upcomingRenewals: SubscriptionCard[];
}

export interface CustomerDashboard {
  activeSubscriptions: number;
  pendingQuotations: number;
  outstandingAmount: number;
  unpaidInvoices: number;
  totalPaid: number;
  subscriptions: SubscriptionCard[];
  invoices: Invoice[];
}

export interface ReportSummary extends Receivables {
  collected: number;
  paymentsCount: number;
  invoiced: number;
  invoicesCount: number;
  newSubscriptions: number;
  closedSubscriptions: number;
  activeSubscriptions: number;
  mrr: number;
  arr: number;
  trend: TrendPoint[];
  byPlan: { name: string; revenue: number }[];
  byProduct: { name: string; revenue: number }[];
}
