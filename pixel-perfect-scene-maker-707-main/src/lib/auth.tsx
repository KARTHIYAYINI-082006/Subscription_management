import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "admin" | "staff" | "customer";
export type User = { name: string; email: string; role: Role };

const KEY = "subscribo.user";
type Ctx = { user: User | null; ready: boolean; login: (u: User) => void; logout: () => void };
const AuthContext = createContext<Ctx | null>(null);

export const demoUsers: Record<Role, User> = {
  admin: { name: "Aarav Mehta", email: "admin@subscribo.io", role: "admin" },
  staff: { name: "Priya Sharma", email: "staff@subscribo.io", role: "staff" },
  customer: { name: "Liam Carter", email: "liam@acmecorp.com", role: "customer" },
};

export function passwordChecks(pw: string) {
  return [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "One number", ok: /\d/.test(pw) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(pw) },
  ];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setUser(JSON.parse(raw));
    setReady(true);
  }, []);
  const login = (u: User) => {
    localStorage.setItem(KEY, JSON.stringify(u));
    localStorage.setItem("subscribo.token", "mock-token");
    setUser(u);
  };
  const logout = () => {
    localStorage.removeItem(KEY);
    localStorage.removeItem("subscribo.token");
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, ready, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
