import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/app/AuthLayout";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Subscribo – Subscription Management System" }, { name: "description", content: "Reset your Subscribo password." }, { property: "og:title", content: "Reset password – Subscribo" }, { property: "og:description", content: "Reset your Subscribo password." }] }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  if (sent)
    return (
      <AuthLayout title="Check your inbox" subtitle={`We sent a reset link to ${email}`}>
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6 text-center shadow-card">
          <span className="grid size-12 place-items-center rounded-full bg-success/12 text-success"><MailCheck className="size-6" /></span>
          <p className="text-sm text-muted-foreground">The link expires in 30 minutes.</p>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">Back to sign in</Link>
        </div>
      </AuthLayout>
    );
  return (
    <AuthLayout title="Forgot password?" subtitle="Enter your email and we'll send you a reset link">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address"); setSent(true); }}>
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full">Send reset link</Button>
        <p className="text-center text-sm"><Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link></p>
      </form>
    </AuthLayout>
  );
}
