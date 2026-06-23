"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Check if there is an error in the hash/query parameters (e.g. link expired)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      
      // Parse query or hash params
      const params = new URLSearchParams(search.replace("?", "") || hash.replace("#", ""));
      const errorCode = params.get("error_code");
      const errorDesc = params.get("error_description");

      if (errorCode === "otp_expired" || errorDesc?.includes("expired")) {
        setError("The password reset link has expired or has already been used. Please request a new link.");
      } else if (errorCode) {
        setError(errorDesc || "An authentication error occurred.");
      }
    }
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      // Auto-logout the session so they have to login with the new password
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Update password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter a new secure password for your account.
        </p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-4">
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
          <Label htmlFor="confirm-password">Confirm Password</Label>
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
          {loading ? "Updating…" : "Update password"}
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
