import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Service-role client — bypasses RLS, only used server-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Resolve the real user_profiles UUID from the cookie.
 *  The cookie may hold a hardcoded demo UUID that doesn't exist in the DB.
 *  Fall back to looking up by email, then by role. */
async function resolveUserId(cookieUserId: string, cookieEmail: string, role: string): Promise<string | null> {
  // 1. Check if the cookie UUID actually exists in user_profiles
  const { data: byId } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("id", cookieUserId)
    .maybeSingle();

  if (byId) return byId.id;

  // 2. Try to find by email
  if (cookieEmail) {
    const { data: byEmail } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("email", cookieEmail)
      .maybeSingle();

    if (byEmail) return byEmail.id;
  }

  // 3. Fall back to any user with the matching role
  const { data: byRole } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("role", role)
    .limit(1)
    .maybeSingle();

  return byRole?.id ?? null;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  const cookieUserId = cookieStore.get("mock_user_id")?.value;
  const cookieEmail = cookieStore.get("mock_user_email")?.value ?? "";

  if (!role || !cookieUserId || !["recruiter", "admin"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve a real UUID that satisfies the FK constraint
  const realUserId = await resolveUserId(cookieUserId, cookieEmail, role);
  if (!realUserId) {
    return NextResponse.json(
      { error: "No recruiter profile found in the database. Please run the seed script (node create-test-users.js) to create test accounts." },
      { status: 400 }
    );
  }

  const body = await request.json();

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .insert({ ...body, created_by: realUserId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ job: data, realUserId });
}
