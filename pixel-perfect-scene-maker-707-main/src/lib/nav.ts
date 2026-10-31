import {
  LayoutDashboard, Users, Package, Layers, FileText, Repeat, Receipt, CreditCard, Percent, Landmark,
  UserCog, BarChart3, Settings, ShoppingBag, User as UserIcon, type LucideIcon,
} from "lucide-react";
import type { Role } from "./auth";

export type NavItem = { title: string; slug: string; icon: LucideIcon };

export const navByRole: Record<Role, NavItem[]> = {
  admin: [
    { title: "Overview", slug: "", icon: LayoutDashboard },
    { title: "Customers", slug: "customers", icon: Users },
    { title: "Products", slug: "products", icon: Package },
    { title: "Plans", slug: "plans", icon: Layers },
    { title: "Quotations", slug: "quotations", icon: FileText },
    { title: "Subscriptions", slug: "subscriptions", icon: Repeat },
    { title: "Invoices", slug: "invoices", icon: Receipt },
    { title: "Payments", slug: "payments", icon: CreditCard },
    { title: "Discounts", slug: "discounts", icon: Percent },
    { title: "Taxes", slug: "taxes", icon: Landmark },
    { title: "Staff Management", slug: "staff", icon: UserCog },
    { title: "Reports", slug: "reports", icon: BarChart3 },
    { title: "Settings", slug: "settings", icon: Settings },
  ],
  staff: [
    { title: "Overview", slug: "", icon: LayoutDashboard },
    { title: "Customers", slug: "customers", icon: Users },
    { title: "Quotations", slug: "quotations", icon: FileText },
    { title: "Subscriptions", slug: "subscriptions", icon: Repeat },
    { title: "Invoices", slug: "invoices", icon: Receipt },
    { title: "Payments", slug: "payments", icon: CreditCard },
    { title: "Settings", slug: "settings", icon: Settings },
  ],
  customer: [
    { title: "Overview", slug: "", icon: LayoutDashboard },
    { title: "Available Plans", slug: "plans", icon: ShoppingBag },
    { title: "My Subscriptions", slug: "subscriptions", icon: Repeat },
    { title: "My Invoices", slug: "invoices", icon: Receipt },
    { title: "Payment History", slug: "payments", icon: CreditCard },
    { title: "Profile", slug: "profile", icon: UserIcon },
  ],
};
