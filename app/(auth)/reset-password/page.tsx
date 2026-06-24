"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

type Step = "request" | "verify";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("request");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Phase 1: Request recovery email with OTP code (via secure server API)
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (res.status === 429) {
        // Rate limited — show the actual message
        setError(data.error || "Too many requests. Please try again later.");
        setLoading(false);
        return;
      }

      // For all other outcomes (success OR unknown email) we advance to the
      // verify step without revealing whether the email is registered.
      setStep("verify");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Phase 2: Verify OTP PIN & Update password
  async function handleVerifyAndReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (code.length < 6) {
      setError("Please enter a valid reset code.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // 1. Verify OTP token (recovery type logs the user in)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "recovery",
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    // 2. Instantly update the password for the now-logged-in user
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      // Log out to clear the temporary session
      await supabase.auth.signOut();
      setTimeout(() => {
        router.push("/login?message=Password updated successfully. Please sign in with your new password.");
      }, 3000);
    }

    setLoading(false);
  }

  if (success) {
    return (
      <div className="space-y-6 animate-fade-in text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="text-[#046C44]" size={40} strokeWidth={1.5} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold text-foreground">Password updated</h1>
          <p className="text-sm text-muted-foreground">
            Your password has been successfully updated. Redirecting you to sign in...
          </p>
        </div>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-1.5">
          <button
            onClick={() => {
              setStep("request");
              setError(null);
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft size={12} /> Back to email entry
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit reset code to <strong>{email}</strong>. Enter it below along with your new password.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Check your spam folder if you don&apos;t see it within a minute.
          </p>
        </div>

        <form onSubmit={handleVerifyAndReset} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Reset Code</Label>
            <Input
              id="code"
              type="text"
              required
              maxLength={12}
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center tracking-widest text-lg font-semibold"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-red-50 rounded-md px-3 py-2 border border-red-100">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full bg-[#046C44] hover:bg-[#035a38]" disabled={loading}>
            {loading && <Loader2 size={14} className="animate-spin mr-2" />}
            {loading ? "Resetting…" : "Reset password"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send you a 6-digit code to reset your password.
        </p>
      </div>

      <form onSubmit={handleSendCode} className="space-y-4">
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
            disabled={loading}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-red-50 rounded-md px-3 py-2 border border-red-100">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full bg-[#046C44] hover:bg-[#035a38]" disabled={loading}>
          {loading && <Loader2 size={14} className="animate-spin mr-2" />}
          {loading ? "Sending code…" : "Send reset code"}
        </Button>
      </form>

      <p className="text-center text-sm">
        <Link href="/login" className="text-[#046C44] font-medium hover:underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
