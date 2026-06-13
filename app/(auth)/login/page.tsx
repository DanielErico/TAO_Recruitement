"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import type { Metadata } from "next";

import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const urlError = searchParams.get("error");

  // ── Hardcoded demo accounts (fallback when DB is unreachable) ──
  const DEMO_ACCOUNTS: Record<string, { role: string; fullName: string; id: string }> = {
    "admin@tao.org":     { role: "admin",     fullName: "TAO Admin",     id: "11111111-1111-1111-1111-111111111111" },
    "recruiter@tao.org": { role: "recruiter", fullName: "TAO Recruiter", id: "22222222-2222-2222-2222-222222222222" },
    "candidate@tao.org": { role: "candidate", fullName: "TAO Candidate", id: "33333333-3333-3333-3333-333333333333" },
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // ── Helper: set cookies and redirect ──
      const loginWithProfile = (role: string, fullName: string, id: string, emailVal: string) => {
        const dest = role === "admin" ? "/admin" : role === "recruiter" ? "/recruiter" : "/candidate";
        document.cookie = `user_role=${role}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `mock_user_id=${id}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `mock_user_email=${emailVal}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `mock_user_name=${fullName}; path=/; max-age=604800; SameSite=Lax`;
        router.push(dest);
      };

      // 1. Try live DB lookup with a 6-second timeout
      let profile: { id: string; role: string; full_name: string } | null = null;
      try {
        const dbPromise = supabase
          .from("user_profiles")
          .select("id, role, full_name")
          .eq("email", email.trim().toLowerCase())
          .maybeSingle();

        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 6000)
        );

        const result = await Promise.race([dbPromise, timeoutPromise]);
        profile = (result as any)?.data ?? null;
      } catch {
        // DB unreachable — will use fallback below
      }

      if (profile) {
        loginWithProfile(profile.role, profile.full_name, profile.id, email);
        setLoading(false);
        return;
      }

      // 2. Fallback to hardcoded demo accounts (works offline / restricted network)
      const lowerEmail = email.trim().toLowerCase();
      const demo = DEMO_ACCOUNTS[lowerEmail];
      if (demo) {
        loginWithProfile(demo.role, demo.fullName, demo.id, lowerEmail);
        setLoading(false);
        return;
      }

      // 3. Unknown email — show a helpful message
      setError(
        `No account found for "${email}". Demo accounts: admin@tao.org, recruiter@tao.org, candidate@tao.org (any password).`
      );
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "An unexpected error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Sign in
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access the platform
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/reset-password"
              className="text-xs text-brand hover:underline underline-offset-2"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {(error || urlError) && (
          <p className="text-sm text-destructive bg-red-50 rounded-md px-3 py-2">
            {error ||
              (urlError === "profile_not_found"
                ? "Database profile not found. If this is a new setup, please ensure you have run the Supabase database migrations (001, 002, 003) in your Supabase SQL Editor."
                : urlError)}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 size={14} className="animate-spin mr-2" />}
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New candidate?{" "}
        <Link href="/register" className="text-brand font-medium hover:underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-10">
          <Loader2 className="animate-spin text-[var(--color-brand)]" size={32} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
