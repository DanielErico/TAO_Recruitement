import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/** Resolve the real user_profiles UUID from the cookie.
 *  The cookie may hold a hardcoded demo UUID that doesn't exist in the DB.
 *  Fall back to looking up by email, then by role. */
async function resolveUserId(cookieUserId: string, cookieEmail: string, role: string): Promise<string | null> {
  const supabase = createAdminClient();

  // 1. Check if the cookie UUID actually exists in user_profiles
  const { data: byId } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", cookieUserId)
    .maybeSingle();

  if (byId) return byId.id;

  // 2. Try to find by email
  if (cookieEmail) {
    const { data: byEmail } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", cookieEmail)
      .maybeSingle();

    if (byEmail) return byEmail.id;
  }

  // 3. Fall back to any user with the matching role
  const { data: byRole } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("role", role)
    .limit(1)
    .maybeSingle();

  return byRole?.id ?? null;
}

export async function POST(request: NextRequest) {
  let role: string | undefined = undefined;
  let resolvedUserId: string | null = null;

  // 1. Try real Supabase auth first
  try {
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();
    if (user) {
      role = user.user_metadata?.role;
      if (!role) {
        const supabase = createAdminClient();
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        role = profile?.role;
      }
      resolvedUserId = user.id;
    }
  } catch (err) {
    // Session retrieval failed or not configured
  }

  // 2. Fall back to cookies if real auth is not available
  if (!role || !resolvedUserId) {
    const cookieStore = await cookies();
    role = cookieStore.get("user_role")?.value;
    const cookieUserId = cookieStore.get("mock_user_id")?.value;
    const cookieEmail = cookieStore.get("mock_user_email")?.value ?? "";

    if (role && cookieUserId && ["recruiter", "admin"].includes(role)) {
      // Resolve a real UUID that satisfies the FK constraint
      resolvedUserId = await resolveUserId(cookieUserId, cookieEmail, role);
    }
  }

  if (!role || !resolvedUserId || !["recruiter", "admin"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const realUserId = resolvedUserId;
  if (!realUserId) {
    return NextResponse.json(
      { error: "No recruiter profile found in the database. Please run the seed script (node create-test-users.js) to create test accounts." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("jobs")
    .insert({ ...body, created_by: realUserId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ job: data, realUserId });
}
