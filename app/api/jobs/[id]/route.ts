import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// PUT /api/jobs/[id] — update a job
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let role: string | undefined = undefined;
  let userId: string | null = null;

  // 1. Try real Supabase auth first
  try {
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();
    if (user) {
      role = user.user_metadata?.role;
      userId = user.id;
    }
  } catch (err) {
    // Session retrieval failed or not configured
  }

  // 2. Fall back to cookies if real auth is not available
  if (!role || !userId) {
    const cookieStore = await cookies();
    role = cookieStore.get("user_role")?.value;
    userId = cookieStore.get("mock_user_id")?.value ?? null;
  }

  if (!role || !userId || !["recruiter", "admin"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("jobs")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ job: data });
}
