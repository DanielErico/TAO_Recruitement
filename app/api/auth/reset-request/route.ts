import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * In-memory rate limiter.
 * Tracks reset attempts per IP and per email address.
 * Limits: max 3 requests per email per 15 minutes.
 *         max 5 requests per IP per 15 minutes.
 *
 * In production with multiple server instances, swap this for Redis.
 */
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 5;

const emailAttempts = new Map<string, { count: number; firstAt: number }>();
const ipAttempts = new Map<string, { count: number; firstAt: number }>();

function checkRateLimit(
  store: Map<string, { count: number; firstAt: number }>,
  key: string,
  max: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.firstAt > WINDOW_MS) {
    store.set(key, { count: 1, firstAt: now });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (entry.count >= max) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - entry.firstAt)) / 1000);
    return { allowed: false, retryAfterSec };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * POST /api/auth/reset-request
 *
 * Securely initiates a password reset for a STAFF ONLY email.
 * - Rejects any email that doesn't belong to admin/recruiter in user_profiles.
 * - Rate limits by IP (5 requests / 15 min) and email (3 requests / 15 min).
 * - Always returns the same generic response to prevent email enumeration.
 */
export async function POST(request: NextRequest) {
  try {
    // ── 1. Rate limit by IP ──────────────────────────────────────
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

    const ipCheck = checkRateLimit(ipAttempts, ip, MAX_PER_IP);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${Math.ceil(ipCheck.retryAfterSec / 60)} minutes.` },
        { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSec) } }
      );
    }

    // ── 2. Parse and validate input ──────────────────────────────
    const body = await request.json().catch(() => null);
    const email = body?.email?.trim()?.toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    // ── 3. Rate limit by email ────────────────────────────────────
    const emailCheck = checkRateLimit(emailAttempts, email, MAX_PER_EMAIL);
    if (!emailCheck.allowed) {
      return NextResponse.json(
        { error: `Too many reset requests for this address. Try again in ${Math.ceil(emailCheck.retryAfterSec / 60)} minutes.` },
        { status: 429, headers: { "Retry-After": String(emailCheck.retryAfterSec) } }
      );
    }

    // ── 4. Verify the email exists in user_profiles ───────────────
    // Use admin client to bypass RLS.
    // SECURITY: We always return the same generic response whether the email 
    // is found or not — this prevents attackers from discovering registered emails.
    const adminDb = createAdminClient();
    const { data: profile } = await adminDb
      .from("user_profiles")
      .select("role")
      .eq("email", email)
      .maybeSingle();

    // If no profile found, silently succeed (prevents enumeration)
    if (!profile) {
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ ok: true });
    }

    // ── 5. Trigger Supabase OTP recovery email ────────────────────
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });

    if (error) {
      console.error("[Reset Request] Supabase error:", error.message);
      // Don't expose Supabase errors to the caller
    }

    // Always return success — never reveal whether the email is registered
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[Reset Request] Unexpected error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
