import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// PUT /api/jobs/[id] — update a job
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  const userId = cookieStore.get("mock_user_id")?.value;

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
