import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
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

    const supabase = createAdminClient();

    // ── 1. Authenticate with Supabase Auth ──────────────────────
    // Use admin client to call signInWithPassword so we can verify the password
    // server-side without exposing the service role key to the browser.
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
    const { data: profile, error: profileError } = await supabase
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
      // Create the missing profile on the fly
      const userMeta = authData.user.user_metadata || {};
      const fallbackName = userMeta.full_name || email.split("@")[0];
      const fallbackRole = userMeta.role || "candidate";

      await supabase.from("user_profiles").upsert({
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: fallbackName,
        role: fallbackRole,
      });

      // Set session cookies
      const cookieStore = await cookies();
      cookieStore.set("user_role", fallbackRole, { maxAge: 604800, path: "/" });
      cookieStore.set("mock_user_id", userId, { maxAge: 604800, path: "/" });
      cookieStore.set("mock_user_email", email.trim().toLowerCase(), { maxAge: 604800, path: "/" });
      cookieStore.set("mock_user_name", fallbackName, { maxAge: 604800, path: "/" });

      return NextResponse.json({
        role: fallbackRole,
        fullName: fallbackName,
        id: userId,
        email: email.trim().toLowerCase(),
      });
    }

    // ── 3. Set session cookies ───────────────────────────────────
    const cookieStore = await cookies();
    cookieStore.set("user_role", profile.role, { maxAge: 604800, path: "/" });
    cookieStore.set("mock_user_id", profile.id, { maxAge: 604800, path: "/" });
    cookieStore.set("mock_user_email", profile.email || email, { maxAge: 604800, path: "/" });
    cookieStore.set("mock_user_name", profile.full_name || "", { maxAge: 604800, path: "/" });

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
