import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { evaluateInterview } from "@/lib/ai";
import { EmailService } from "@/lib/email-service";


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
    const { applicationId, candidateId, answers = [], startTime, switchedTabs = false } = body;

    if (!applicationId || !candidateId) {
      return NextResponse.json({ error: "Missing applicationId or candidateId" }, { status: 400 });
    }

    // Security check: candidate can only submit their own interview
    if (candidateId !== userId && role !== "admin" && role !== "recruiter") {
      return NextResponse.json({ error: "Forbidden access" }, { status: 403 });
    }

    const supabase = createAdminClient();

    // 1. Fetch application details to verify it exists and get job and candidate info
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select(`
        id,
        job_id,
        candidate_id,
        jobs (
          id,
          title,
          description,
          requirements,
          responsibilities,
          department:departments (name)
        ),
        candidate:user_profiles (
          id,
          full_name,
          email,
          candidate_profiles (
            location,
            bio,
            skills
          )
        )
      `)
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const job = application.jobs as any;
    const jobTitle = job?.title || "Target Position";
    const jobDescription = job?.description || "";
    const jobRequirements = job?.requirements || "";
    const jobResponsibilities = job?.responsibilities || "";
    const departmentName = job?.department?.name || "General";
    const candidateObj = Array.isArray(application.candidate) ? application.candidate[0] : (application.candidate as any);
    const candidateProfile = Array.isArray(candidateObj?.candidate_profiles)
      ? candidateObj?.candidate_profiles[0]
      : candidateObj?.candidate_profiles;
    const candidateName = candidateObj?.full_name || "Candidate";

    // 1.5 Fetch candidate's CV analysis record (candidate_ai_analysis first, then cv_analyses)
    const [{ data: aiAnalysis }, { data: cvAnalysis }] = await Promise.all([
      supabase
        .from("candidate_ai_analysis")
        .select("*")
        .eq("application_id", applicationId)
        .maybeSingle(),
      supabase
        .from("cv_analyses")
        .select("*")
        .eq("application_id", applicationId)
        .maybeSingle(),
    ]);

    const cvAnalysisData = aiAnalysis || cvAnalysis || {
      professional_summary: (candidateProfile as any)?.bio || "",
      skills: (candidateProfile as any)?.skills || [],
      strengths: [],
      weaknesses: [],
      work_experience: [],
      job_fit_score: 70
    };

    const start = startTime ? new Date(startTime) : new Date(Date.now() - 15 * 60 * 1000);
    const end = new Date();
    const durationMins = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

    // 2. Upsert into interviews table to prevent constraint errors
    const { data: interview, error: intError } = await supabase
      .from("interviews")
      .upsert(
        {
          application_id: applicationId,
          job_id: application.job_id,
          candidate_id: candidateId,
          status: "completed",
          started_at: start.toISOString(),
          completed_at: end.toISOString()
        },
        { onConflict: "application_id" }
      )
      .select()
      .single();

    if (intError) {
      console.error("Interview save failed:", intError);
      throw new Error(`Interview save failed: ${intError.message}`);
    }

    // 3. Clear existing responses if any, then insert new ones
    await supabase
      .from("interview_responses")
      .delete()
      .eq("interview_id", interview.id);

    const responsesToInsert = answers.map((ans: any) => ({
      interview_id: interview.id,
      question_text: ans.question,
      response_text: ans.response
    }));

    if (switchedTabs) {
      responsesToInsert.push({
        interview_id: interview.id,
        question_text: "System Integrity Alert",
        response_text: "[ALERT] Candidate switched tabs/windows during the active interview session. The interview was automatically terminated and submitted."
      });
    }

    if (responsesToInsert.length === 0) {
      responsesToInsert.push({
        interview_id: interview.id,
        question_text: "System Information",
        response_text: "The candidate's interview session timed out before any answers could be successfully recorded."
      });
    }

    const { error: respError } = await supabase
      .from("interview_responses")
      .insert(responsesToInsert);

    if (respError) {
      console.error("Responses insertion failed:", respError);
      throw new Error(`Responses insertion failed: ${respError.message}`);
    }

    // 4. Generate AI evaluation metrics using live CV and interview data
    console.log("[Submit Route] Evaluating interview with job:", jobTitle, "and candidate answers:", answers.length);

    let evaluation;
    try {
      evaluation = await evaluateInterview({
        jobTitle,
        jobDescription,
        jobRequirements,
        jobResponsibilities,
        department: departmentName,
        organisationName: "The Agriculture Option (TAO)",
        candidateName,
        candidateId,
        cvAnalysis: cvAnalysisData,
        interviewResponses: answers,
        durationMinutes: durationMins,
        switchedTabs,
      });
    } catch (evalErr: any) {
      console.error("[Submit Route] evaluateInterview threw error, using fallback:", evalErr);
      const base = 75;
      evaluation = {
        technical_score: base,
        communication_score: base + 5,
        experience_score: base,
        problem_solving_score: base,
        culture_fit_score: base,
        overall_score: base,
        recommendation: "recommended",
        recommended_next_step: "Recommend for further recruiter review" as const,
        recruiter_summary: `The candidate successfully completed the screening interview. Fallback evaluation applied: ${evalErr.message}`,
        ai_rationale: `Automated baseline scoring calculated due to an evaluation error: ${evalErr.message}`,
        report: {} as any,
      };
    }

    let recruiterSummary = evaluation.recruiter_summary;
    let aiRationale = evaluation.ai_rationale;

    if (switchedTabs) {
      recruiterSummary = `⚠️ INTEGRITY WARNING: Tab switching detected. The interview was automatically terminated and flagged.\n\n${recruiterSummary}`;
      aiRationale = `FLAGGED EVENT: Candidate attempted to switch browser tabs or windows during this interview. Session was closed automatically.\n\n${aiRationale}`;
      
      // Override all scores to 0 and recommendation to not_recommended to penalize cheating
      evaluation.overall_score = 0;
      evaluation.technical_score = 0;
      evaluation.communication_score = 0;
      evaluation.experience_score = 0;
      evaluation.problem_solving_score = 0;
      evaluation.culture_fit_score = 0;
      evaluation.recommendation = "not_recommended";
    }

    const { error: evalError } = await supabase
      .from("evaluations")
      .upsert(
        {
          application_id: applicationId,
          candidate_id: candidateId,
          job_id: application.job_id,
          technical_score: evaluation.technical_score,
          communication_score: evaluation.communication_score,
          experience_score: evaluation.experience_score,
          problem_solving_score: evaluation.problem_solving_score,
          culture_fit_score: evaluation.culture_fit_score,
          overall_score: evaluation.overall_score,
          recommendation: evaluation.recommendation,
          recruiter_summary: recruiterSummary,
          ai_rationale: aiRationale
        },
        { onConflict: "application_id" }
      );


    if (evalError) {
      console.error("Evaluation save failed:", evalError);
      throw new Error(`Evaluation save failed: ${evalError.message}`);
    }

    // 5. Update Application status to 'evaluation'
    const { error: statusError } = await supabase
      .from("applications")
      .update({ status: "evaluation" })
      .eq("id", applicationId);

    if (statusError) {
      console.error("Application status update failed:", statusError);
      throw new Error(`Application status update failed: ${statusError.message}`);
    }

    // ── 5.5. Send email notification to HR (non-blocking) ──
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name, email")
        .eq("id", candidateId)
        .single();

      if (profile) {
        const hrRecipients = EmailService.getHRRecipients();
        const origin = request.nextUrl.origin;
        await Promise.allSettled(
          hrRecipients.map((recipient) =>
            EmailService.sendHRInterviewCompleted(
              recipient,
              profile.full_name || "Candidate",
              profile.email,
              jobTitle,
              evaluation.overall_score,
              evaluation.technical_score,
              evaluation.communication_score,
              evaluation.experience_score,
              evaluation.problem_solving_score,
              evaluation.culture_fit_score,
              evaluation.recommendation,
              switchedTabs,
              applicationId,
              origin
            )
          )
        );
      }
    } catch (emailErr: any) {
      console.error("[Submit Route] Failed to send HR interview completion email:", emailErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to complete interview submission:", err);
    return NextResponse.json({ error: err.message || "Failed to submit interview" }, { status: 500 });
  }
}
