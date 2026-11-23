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
        candidate:user_profiles (
          id,
          full_name,
          email,
          candidate_profiles (
            location,
            bio,
            skills,
            linkedin_url,
            portfolio_url
          )
        ),
        job:jobs (
          id,
          title,
          description,
          requirements,
          responsibilities,
          skills_required,
          employment_type,
          location,
          department:departments (name)
        )
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
    const candidateObj = Array.isArray(app.candidate) ? app.candidate[0] : (app.candidate as any);
    const candidateProfile = Array.isArray(candidateObj?.candidate_profiles)
      ? candidateObj?.candidate_profiles[0]
      : candidateObj?.candidate_profiles;
    const candidateName = candidateObj?.full_name || "Candidate";

    // 2. Fetch CV Analysis details (check candidate_ai_analysis first, then cv_analyses)
    const [{ data: aiAnalysis }, { data: cvAnalysis }] = await Promise.all([
      supabase
        .from("candidate_ai_analysis")
        .select("professional_summary, skills, work_experience, education")
        .eq("application_id", applicationId)
        .maybeSingle(),
      supabase
        .from("cv_analyses")
        .select("professional_summary, skills, work_experience, education")
        .eq("application_id", applicationId)
        .maybeSingle(),
    ]);

    const cvSummary =
      aiAnalysis?.professional_summary ||
      cvAnalysis?.professional_summary ||
      candidateProfile?.bio ||
      `Applicant for ${job.title} position.`;

    const cvSkills =
      aiAnalysis?.skills ||
      cvAnalysis?.skills ||
      candidateProfile?.skills ||
      job.skills_required ||
      [];

    const workExperience = aiAnalysis?.work_experience || cvAnalysis?.work_experience || [];
    const education = aiAnalysis?.education || cvAnalysis?.education || [];

    // 3. Generate dynamic question using Universal AI Interview Engine
    const result = await generateNextInterviewQuestion({
      jobTitle: job.title,
      jobDescription: job.description || "",
      jobRequirements: job.requirements || "",
      jobResponsibilities: job.responsibilities || "",
      department: job.department?.name || "General",
      location: job.location || "",
      employmentType: job.employment_type || "Full-time",
      organisationName: "The Agriculture Option (TAO)",
      candidateName,
      candidateId: app.candidate_id,
      cvSummary,
      cvSkills,
      workExperience,
      education,
      chatHistory,
      questionIndex,
      globalTimeLeft,
    });

    return NextResponse.json({
      success: true,
      question: result.question,
      isComplete: result.isComplete,
      recommendedSeconds: result.recommendedSeconds,
      section: result.section,
      targetCompetency: result.targetCompetency,
    });
  } catch (err: any) {
    console.error("Failed to generate next interview question:", err);
    return NextResponse.json({ error: err.message || "Question generation failed" }, { status: 500 });
  }
}
