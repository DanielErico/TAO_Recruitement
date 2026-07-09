import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { generateNextInterviewQuestion } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const { createClient: createAuthClient } = await import("@/lib/supabase/server");
  const supabaseAuth = await createAuthClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  let role = user.user_metadata?.role as string | undefined;
  if (!role) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role;
  }

  const userId = user.id;

  try {
    const body = await request.json();
    const { applicationId, questionIndex, chatHistory = [], globalTimeLeft } = body;

    if (!applicationId || questionIndex === undefined) {
      return NextResponse.json({ error: "Missing applicationId or questionIndex" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch application, job specs, and candidate details
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select(`
        id,
        candidate_id,
        candidate:user_profiles (full_name),
        job:jobs (title, description, requirements)
      `)
      .eq("id", applicationId)
      .single();

    if (appError || !app) {
      return NextResponse.json({ error: "Application details not found" }, { status: 404 });
    }

    // Security check: candidate can only take their own interview
    if (app.candidate_id !== userId && role !== "recruiter" && role !== "admin") {
      return NextResponse.json({ error: "Forbidden access" }, { status: 403 });
    }

    const job = app.job as any;
    const candidateName = (app.candidate as any)?.full_name || "Candidate";

    // 2. Fetch CV Analysis details
    const { data: cvAnalysis } = await supabase
      .from("cv_analyses")
      .select("professional_summary, skills")
      .eq("application_id", applicationId)
      .maybeSingle();

    const cvSummary = cvAnalysis?.professional_summary || "Eager applicant for this position.";
    const cvSkills = cvAnalysis?.skills || [];

    // 3. Generate dynamic question
    const result = await generateNextInterviewQuestion(
      job.title,
      job.description || "",
      candidateName,
      cvSummary,
      cvSkills,
      chatHistory,
      questionIndex,
      globalTimeLeft
    );

    return NextResponse.json({
      success: true,
      question: result.question,
      isComplete: result.isComplete,
      recommendedSeconds: result.recommendedSeconds,
    });
  } catch (err: any) {
    console.error("Failed to generate next interview question:", err);
    return NextResponse.json({ error: err.message || "Question generation failed" }, { status: 500 });
  }
}
