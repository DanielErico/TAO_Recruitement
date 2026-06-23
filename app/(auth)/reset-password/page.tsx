"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const origin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${origin}/api/auth/callback?next=/update-password`,
      }
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }

    setLoading(false);
  }

  if (sent) {
    return (
      <div className="space-y-6 animate-fade-in text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="text-brand" size={40} strokeWidth={1.5} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold text-foreground">Check your inbox</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a password reset link to <strong>{email}</strong>.<br />
            The link expires in 1 hour.
          </p>
        </div>
        <Link
          href="/login"
          className="block text-sm text-brand font-medium hover:underline underline-offset-2"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Reset password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send a reset link.
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@tao.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive bg-red-50 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm">
        <Link href="/login" className="text-brand font-medium hover:underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
