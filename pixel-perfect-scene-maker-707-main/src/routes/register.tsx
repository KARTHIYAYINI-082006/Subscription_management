import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout, PasswordInput } from "@/components/app/AuthLayout";
import { passwordChecks, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Subscribo – Subscription Management System" }, { name: "description", content: "Create your Subscribo account." }, { property: "og:title", content: "Create account – Subscribo" }, { property: "og:description", content: "Create your Subscribo account." }] }),
  component: Register,
});

function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", company: "", email: "" });
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name || !f.company) return setError("Name and company are required");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setError("Enter a valid email address");
    if (!passwordChecks(pw).every((c) => c.ok)) return setError("Password doesn't meet all requirements");
    if (pw !== confirm) return setError("Passwords don't match");
    login({ name: f.name, email: f.email, role: "customer" });
    toast.success("Account created");
    navigate({ to: "/$role", params: { role: "customer" } });
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start managing your subscriptions in minutes">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="company">Company</Label><Input id="company" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="email">Work email</Label><Input id="email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="password">Password</Label><PasswordInput value={pw} onChange={setPw} showRules /></div>
        <div className="space-y-1.5"><Label htmlFor="confirm">Confirm password</Label><PasswordInput id="confirm" value={confirm} onChange={setConfirm} /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full">Create account</Button>
        <p className="text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></p>
      </form>
    </AuthLayout>
  );
}
