// API service layer. Currently resolves mock data; swap `USE_MOCK` off and point
// API_BASE_URL at the Node.js/Express (MongoDB Atlas) backend when ready.
import * as mock from "@/lib/mock-data";

export const API_BASE_URL = import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:5000/api";
const USE_MOCK = true;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("subscribo.token") : null;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

const delay = <T,>(data: T) => new Promise<T>((r) => setTimeout(() => r(data), 150));

function resource<T>(path: string, data: T[]) {
  return {
    list: (): Promise<T[]> => (USE_MOCK ? delay(data) : http<T[]>(path)),
    create: (body: Partial<T>): Promise<T> =>
      USE_MOCK ? delay(body as T) : http<T>(path, { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<T>): Promise<T> =>
      USE_MOCK ? delay(body as T) : http<T>(`${path}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string): Promise<void> =>
      USE_MOCK ? delay(undefined) : http<void>(`${path}/${id}`, { method: "DELETE" }),
  };
}

export const api = {
  customers: resource("/customers", mock.customers),
  products: resource("/products", mock.products),
  plans: resource("/plans", mock.plans),
  quotations: resource("/quotations", mock.quotations),
  subscriptions: resource("/subscriptions", mock.subscriptions),
  invoices: resource("/invoices", mock.invoices),
  payments: resource("/payments", mock.payments),
  discounts: resource("/discounts", mock.discounts),
  taxes: resource("/taxes", mock.taxes),
  staff: resource("/staff", mock.staff),
};
