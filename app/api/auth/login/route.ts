import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 *
 * Authenticates a user with email + password via Supabase Auth, then
 * looks up their role in user_profiles (using the admin client to bypass RLS),
 * and writes the session cookies the rest of the app relies on.
 *
 * Returns: { role, fullName, id, email } on success
 * or { error } on failure.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = await createClient();

    // ── 1. Authenticate with Supabase Auth ──────────────────────
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !authData?.user) {
      // Return a user-friendly message; don't leak internals
      const msg = authError?.message || "Sign in failed.";
      // Supabase returns "Invalid login credentials" for wrong password/email
      const isCredentials = msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials");
      return NextResponse.json(
        { error: isCredentials ? "Incorrect email or password. Please try again." : msg },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // ── 2. Look up the user's profile (role, name) ──────────────
    // Use a fresh admin client to query user_profiles to bypass RLS entirely during login
    const adminDb = createAdminClient();
    const { data: profile, error: profileError } = await adminDb
      .from("user_profiles")
      .select("id, role, full_name, email")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[Login API] Profile lookup error:", profileError.message);
      return NextResponse.json(
        { error: "Account found but profile could not be loaded. Please contact support." },
        { status: 500 }
      );
    }

    // Profile should always exist (created by DB trigger on signup), but handle edge case
    if (!profile) {
      const userMeta = authData.user.user_metadata || {};
      const fallbackRole = userMeta.role || "candidate";

      // Do NOT create profiles on the fly for admin and recruiter roles
      if (fallbackRole === "admin" || fallbackRole === "recruiter") {
        return NextResponse.json(
          { error: "Account profile is missing. Please contact your administrator." },
          { status: 403 }
        );
      }

      const fallbackName = userMeta.full_name || email.split("@")[0];

      // Safe to upsert candidate on the fly
      await adminDb.from("user_profiles").upsert({
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: fallbackName,
        role: "candidate",
      });

      // Set session cookies
      const cookieStore = await cookies();
      cookieStore.set("user_role", "candidate", { maxAge: 604800, path: "/" });
      cookieStore.delete("mock_user_id");
      cookieStore.delete("mock_user_email");
      cookieStore.delete("mock_user_name");

      return NextResponse.json({
        role: "candidate",
        fullName: fallbackName,
        id: userId,
        email: email.trim().toLowerCase(),
      });
    }

    // ── 3. Patch user_metadata.role if missing/stale ─────────────
    // Ensures the middleware (which reads user_metadata) always has the right role.
    const metaRole = authData.user.user_metadata?.role;
    if (!metaRole || metaRole !== profile.role) {
      await adminDb.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...authData.user.user_metadata,
          role: profile.role,
          full_name: profile.full_name,
        },
      });
    }

    // ── 4. Set session cookies ───────────────────────────────────
    const cookieStore = await cookies();
    cookieStore.set("user_role", profile.role, { maxAge: 604800, path: "/" });
    cookieStore.delete("mock_user_id");
    cookieStore.delete("mock_user_email");
    cookieStore.delete("mock_user_name");

    return NextResponse.json({
      role: profile.role,
      fullName: profile.full_name,
      id: profile.id,
      email: profile.email || email,
    });
  } catch (err: any) {
    console.error("[Login API] Unexpected error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
