import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  let role = user.user_metadata?.role as string | undefined;
  if (!role) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role;
  }

  if (!role || !["recruiter", "admin"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { applicationId, recruiterSummary } = body;

    if (!applicationId) {
      return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if an evaluation record exists, if not create a default one
    const { data: existingEval } = await supabase
      .from("evaluations")
      .select("id")
      .eq("application_id", applicationId)
      .maybeSingle();

    if (!existingEval) {
      // Get job and candidate details from application
      const { data: app } = await supabase
        .from("applications")
        .select("job_id, candidate_id")
        .eq("id", applicationId)
        .single();

      if (app) {
        await supabase
          .from("evaluations")
          .insert({
            application_id: applicationId,
            candidate_id: app.candidate_id,
            job_id: app.job_id,
            technical_score: 80,
            communication_score: 80,
            experience_score: 80,
            problem_solving_score: 80,
            culture_fit_score: 80,
            overall_score: 80,
            recommendation: "recommended",
            recruiter_summary: recruiterSummary || "",
            ai_rationale: "Default assessment profile created by recruiter."
          });
      }
    } else {
      await supabase
        .from("evaluations")
        .update({ recruiter_summary: recruiterSummary || "" })
        .eq("application_id", applicationId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Notes update failed:", err);
    return NextResponse.json({ error: err.message || "Failed to update recruiter notes" }, { status: 500 });
  }
}
