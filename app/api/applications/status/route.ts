import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;

  if (!role || !["recruiter", "admin"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { applicationId, status } = body;

    if (!applicationId || !status) {
      return NextResponse.json({ error: "Missing applicationId or status" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // If status is moved to 'interview', check if interview record exists
    if (status === "interview") {
      const { data: app } = await supabase
        .from("applications")
        .select("job_id, candidate_id")
        .eq("id", applicationId)
        .single();

      if (app) {
        // Create an interview invite if not exists
        const { data: existingInterview } = await supabase
          .from("interviews")
          .select("id")
          .eq("application_id", applicationId)
          .maybeSingle();

        if (!existingInterview) {
          await supabase
            .from("interviews")
            .insert({
              application_id: applicationId,
              job_id: app.job_id,
              candidate_id: app.candidate_id,
              status: "pending"
            });
        }
      }
    }

    const { data, error } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", applicationId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, application: data });
  } catch (err: any) {
    console.error("Status update failed:", err);
    return NextResponse.json({ error: err.message || "Failed to update status" }, { status: 500 });
  }
}
