import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout, PasswordInput } from "@/components/app/AuthLayout";
import { demoUsers, useAuth, type Role } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Subscribo – Subscription Management System" }, { name: "description", content: "Sign in to your Subscribo billing workspace." }, { property: "og:title", content: "Sign in – Subscribo" }, { property: "og:description", content: "Sign in to your Subscribo billing workspace." }] }),
  component: Login,
});

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState(demoUsers.admin.email);
  const [password, setPassword] = useState("Demo@1234");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    login({ ...demoUsers[role], email });
    toast.success(`Signed in as ${role}`);
    navigate({ to: "/$role", params: { role } });
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Subscribo workspace">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {(["admin", "staff", "customer"] as Role[]).map((r) => (
            <button type="button" key={r} onClick={() => { setRole(r); setEmail(demoUsers[r].email); }}
              className={cn("rounded-md py-1.5 text-sm font-medium capitalize transition", role === r ? "bg-card text-foreground shadow-card" : "text-muted-foreground")}>{r}</button>
          ))}
        </div>
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5">
          <div className="flex justify-between"><Label htmlFor="password">Password</Label><Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link></div>
          <PasswordInput value={password} onChange={setPassword} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full">Sign in</Button>
        <p className="rounded-lg bg-accent p-3 text-xs text-accent-foreground">Demo mode: pick a role above and sign in with any password of 8+ characters.</p>
        <p className="text-center text-sm text-muted-foreground">New to Subscribo? <Link to="/register" className="font-medium text-primary hover:underline">Create an account</Link></p>
      </form>
    </AuthLayout>
  );
}
