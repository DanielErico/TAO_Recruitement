"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const urlError = searchParams.get("error");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const lowerEmail = email.trim().toLowerCase();

    try {
      // Real authentication via server-side API
      // The API route calls supabase.auth.signInWithPassword() server-side,
      // validates the password, looks up the user's role, and sets cookies.
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lowerEmail, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign in failed. Please check your credentials.");
        return;
      }

      // Cookies are already set server-side; do a hard navigation so the
      // dashboard layout reads the fresh cookies on first render.
      const dest =
        data.role === "admin" ? "/admin" :
        data.role === "recruiter" ? "/recruiter" :
        "/candidate";

      window.location.href = dest;
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
