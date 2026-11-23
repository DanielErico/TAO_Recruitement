/**
 * TAO Recruit AI — POST /api/interviews/reset
 * ============================================================
 * Handles recruiter actions for an interview:
 *   - "retake": Resets the interview state so the candidate can retake it.
 *   - "re-evaluate": Re-runs Universal AI Recruitment Engine evaluation.
 *
 * Auth: Recruiter or Admin only
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateInterview, formatAIErrorCode } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.user_metadata?.role;
    if (!["recruiter", "admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: Recruiter or Admin role required" }, { status: 403 });
    }

    const body = await request.json();
    const { applicationId, action } = body;

    if (!applicationId) {
      return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch application, job and candidate
    const { data: application, error: appError } = await admin
      .from("applications")
      .select(`
        id,
        status,
        job_id,
        candidate_id,
        candidate:user_profiles!candidate_id (full_name),
        job:jobs (
          id,
          title,
          description,
          requirements,
          responsibilities,
          departments:departments (name)
        )
      `)
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // ── ACTION: RETAKE ──────────────────────────────────────────
    if (action === "retake") {
      // 1. Reset interview record
      await admin
        .from("interviews")
        .update({
          status: "pending",
          started_at: null,
          completed_at: null,
        })
        .eq("application_id", applicationId);

      // 2. Delete previous interview responses
      const { data: interview } = await admin
        .from("interviews")
        .select("id")
        .eq("application_id", applicationId)
        .maybeSingle();

      if (interview) {
        await admin
          .from("interview_responses")
          .delete()
          .eq("interview_id", interview.id);
      }

      // 3. Delete previous evaluation
      await admin
        .from("evaluations")
        .delete()
        .eq("application_id", applicationId);

      // 4. Update application status back to 'interview'
      await admin
        .from("applications")
        .update({ status: "interview" })
        .eq("id", applicationId);

      return NextResponse.json({
        success: true,
        message: "Interview has been reset. The candidate can now retake the AI screening interview.",
        applicationStatus: "interview",
      });
    }

    // ── ACTION: RE-EVALUATE ──────────────────────────────────────
    if (action === "re-evaluate") {
      // Fetch interview & responses
      const { data: interview } = await admin
        .from("interviews")
        .select("id, started_at, completed_at")
        .eq("application_id", applicationId)
        .maybeSingle();

      let answers: { question: string; response: string }[] = [];
      let durationMins = 15;

      if (interview) {
        const { data: responses } = await admin
          .from("interview_responses")
          .select("question_text, response_text")
          .eq("interview_id", interview.id)
          .order("created_at", { ascending: true });

        answers = (responses || [])
          .filter((r) => !r.question_text.includes("System Status Alert"))
          .map((r) => ({
            question: r.question_text,
            response: r.response_text,
          }));

        if (interview.started_at && interview.completed_at) {
          const start = new Date(interview.started_at).getTime();
          const end = new Date(interview.completed_at).getTime();
          durationMins = Math.max(1, Math.round((end - start) / 60000));
        }
      }

      // Fetch CV analysis if available
      const { data: cvAnalysis } = await admin
        .from("candidate_ai_analysis")
        .select("*")
        .eq("application_id", applicationId)
        .maybeSingle();

      const job: any = application.job;
      const candidateName = (application.candidate as any)?.full_name || "Candidate";
      const deptName = job?.departments?.name || "General";

      const evaluation = await evaluateInterview({
        jobTitle: job?.title || "Role",
        jobDescription: job?.description || "",
        jobRequirements: job?.requirements || "",
        jobResponsibilities: job?.responsibilities || "",
        department: deptName,
        organisationName: "The Agriculture Option (TAO)",
        candidateName,
        candidateId: application.candidate_id,
        cvAnalysis: cvAnalysis || {},
        interviewResponses: answers,
        durationMinutes: durationMins,
        switchedTabs: false, // Recruiter re-evaluation evaluates actual response content
      });

      const { data: savedEval, error: evalSaveError } = await admin
        .from("evaluations")
        .upsert(
          {
            application_id: applicationId,
            candidate_id: application.candidate_id,
            job_id: application.job_id,
            technical_score: evaluation.technical_score,
            communication_score: evaluation.communication_score,
            experience_score: evaluation.experience_score,
            problem_solving_score: evaluation.problem_solving_score,
            culture_fit_score: evaluation.culture_fit_score,
            overall_score: evaluation.overall_score,
            recommendation: evaluation.recommendation,
            recruiter_summary: evaluation.recruiter_summary,
            ai_rationale: evaluation.ai_rationale,
          },
          { onConflict: "application_id" }
        )
        .select()
        .single();

      if (evalSaveError) {
        throw evalSaveError;
      }

      return NextResponse.json({
        success: true,
        message: "Interview evaluation re-calculated successfully.",
        evaluation: savedEval,
      });
    }

    return NextResponse.json({ error: "Invalid action. Supported: 'retake', 're-evaluate'" }, { status: 400 });
  } catch (err: any) {
    console.error("[Interviews:Reset] Error:", err.message);
    const formatted = formatAIErrorCode(err);
    return NextResponse.json(
      { error: formatted.display, errorCode: formatted.code },
      { status: 500 }
    );
  }
}

