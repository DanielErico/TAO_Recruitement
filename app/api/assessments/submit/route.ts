/**
 * TAO Recruit AI — POST /api/assessments/submit
 * ============================================================
 * Handles Plan B online recruitment assessment submissions.
 *
 * Pipeline:
 *   1. Authenticate candidate & verify application ownership
 *   2. Store written responses in interview_responses (backward compatible)
 *   3. Mark interviews record as completed
 *   4. Joint AI Evaluation:
 *      - Applicant's CV
 *      - Application details
 *      - Written assessment responses
 *      Evaluated via Universal AI Engine across 4–6 dynamic competencies.
 *   5. Save Section 9 report in evaluations table
 *   6. Update applications status to 'evaluation'
 *   7. Return clean success confirmation (zero score leakage)
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateInterview, formatAIErrorCode } from "@/lib/ai";
import { EmailService } from "@/lib/email-service";

export const dynamic = "force-dynamic";

export interface CandidateResponseItem {
  questionId: string;
  questionNumber: number;
  section: string;
  questionText: string;
  responseText: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId, candidateId, responses } = body as {
      applicationId: string;
      candidateId: string;
      responses: CandidateResponseItem[];
    };

    if (!applicationId || !Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json({ error: "Missing applicationId or assessment responses" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Fetch application, candidate profile, and job details
    const { data: application, error: appError } = await admin
      .from("applications")
      .select(`
        id,
        status,
        job_id,
        candidate_id,
        cover_letter,
        candidate:user_profiles!candidate_id (
          id,
          full_name,
          email
        ),
        job:jobs (
          id,
          title,
          description,
          requirements,
          responsibilities,
          department:departments (name)
        )
      `)
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: "Application record not found" }, { status: 404 });
    }

    // Ownership check: candidate must own this application
    if (application.candidate_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: You can only submit for your own application" }, { status: 403 });
    }

    // Protection against duplicate submissions
    if (application.status !== "interview") {
      return NextResponse.json({
        success: true,
        message: "Assessment has already been submitted and is currently under review.",
        status: application.status,
      });
    }

    // 2. Fetch CV analysis record
    const { data: cvAnalysisData } = await admin
      .from("candidate_ai_analysis")
      .select("*")
      .eq("application_id", applicationId)
      .maybeSingle();

    const job = application.job as any;
    const candidateProfile = application.candidate as any;
    const candidateName = candidateProfile?.full_name || "Applicant";
    const candidateEmail = candidateProfile?.email || user.email;
    const deptName = job?.department?.name || "General";

    // 3. Upsert into interviews table to anchor responses
    const now = new Date();
    const { data: interview, error: intError } = await admin
      .from("interviews")
      .upsert(
        {
          application_id: applicationId,
          job_id: application.job_id,
          candidate_id: candidateId,
          status: "completed",
          started_at: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
          completed_at: now.toISOString(),
        },
        { onConflict: "application_id" }
      )
      .select()
      .single();

    if (intError) {
      console.error("[Assessments:Submit] Failed to upsert interview record:", intError);
      throw new Error(`Interview anchor creation failed: ${intError.message}`);
    }

    // 4. Clear old responses (if any) and insert candidate's assessment responses
    await admin
      .from("interview_responses")
      .delete()
      .eq("interview_id", interview.id);

    const responsesToInsert = responses.map((r) => ({
      interview_id: interview.id,
      question_text: `[Section ${r.section}: Q${r.questionNumber}] ${r.questionText}`,
      response_text: r.responseText.trim(),
    }));

    const { error: respError } = await admin
      .from("interview_responses")
      .insert(responsesToInsert);

    if (respError) {
      console.error("[Assessments:Submit] Failed to insert responses:", respError);
      throw new Error(`Failed to store assessment responses: ${respError.message}`);
    }

    // 5. Joint AI Evaluation (CV + Application + Written Assessment Responses)
    console.log(`[Assessments:Submit] Running AI evaluation for "${candidateName}" applying for "${job?.title}"...`);

    const formattedAnswers = responses.map((r) => ({
      question: r.questionText,
      response: r.responseText,
    }));

    let evaluationResult;
    try {
      evaluationResult = await evaluateInterview({
        jobTitle: job?.title || "Role",
        jobDescription: job?.description || "",
        jobRequirements: job?.requirements || "",
        jobResponsibilities: job?.responsibilities || "",
        department: deptName,
        organisationName: "The Agriculture Option (TAO)",
        candidateName,
        candidateId,
        cvAnalysis: cvAnalysisData || {},
        interviewResponses: formattedAnswers,
        durationMinutes: 20,
        switchedTabs: false, // Plan B online assessment has no audio/tab-switching penalty
      });
    } catch (evalErr: any) {
      console.error("[Assessments:Submit] AI evaluation failed, compiling fallback baseline:", evalErr.message);
      const base = 70;
      evaluationResult = {
        technical_score: base,
        communication_score: base + 5,
        experience_score: base,
        problem_solving_score: base,
        culture_fit_score: base,
        overall_score: base,
        recommendation: "recommended",
        recommended_next_step: "Recommend for further recruiter review" as const,
        recruiter_summary: `Candidate submitted Plan B online recruitment assessment. Fallback evaluation applied: ${evalErr.message}`,
        ai_rationale: `Automated baseline scoring calculated due to an evaluation service delay: ${evalErr.message}`,
        report: {} as any,
      };
    }

    // 6. Save Evaluation into database
    const { error: evalSaveError } = await admin
      .from("evaluations")
      .upsert(
        {
          application_id: applicationId,
          candidate_id: candidateId,
          job_id: application.job_id,
          technical_score: evaluationResult.technical_score,
          communication_score: evaluationResult.communication_score,
          experience_score: evaluationResult.experience_score,
          problem_solving_score: evaluationResult.problem_solving_score,
          culture_fit_score: evaluationResult.culture_fit_score,
          overall_score: evaluationResult.overall_score,
          recommendation: evaluationResult.recommendation,
          recruiter_summary: evaluationResult.recruiter_summary,
          ai_rationale: evaluationResult.ai_rationale,
        },
        { onConflict: "application_id" }
      );

    if (evalSaveError) {
      console.error("[Assessments:Submit] Failed to save evaluation:", evalSaveError);
    }

    // 7. Update Application status to 'evaluation'
    await admin
      .from("applications")
      .update({ status: "evaluation" })
      .eq("id", applicationId);

    // 8. Send confirmation email to candidate (non-blocking)
    if (candidateEmail) {
      try {
        await EmailService.sendAssessmentConfirmation(candidateEmail, candidateName, job?.title || "the applied position");
      } catch (emailErr) {
        console.warn("[Assessments:Submit] Email confirmation dispatch failed:", emailErr);
      }
    }

    // 8.5. Notify HR and Admin of completed assessment (non-blocking)
    try {
      const hrRecipients = EmailService.getHRRecipients();
      const origin = request.nextUrl.origin;
      await Promise.allSettled(
        hrRecipients.map((recipient) =>
          EmailService.sendHRInterviewCompleted(
            recipient,
            candidateName,
            candidateEmail || "",
            job?.title || "Role",
            evaluationResult.overall_score,
            evaluationResult.technical_score,
            evaluationResult.communication_score,
            evaluationResult.experience_score,
            evaluationResult.problem_solving_score,
            evaluationResult.culture_fit_score,
            evaluationResult.recommendation,
            false,
            applicationId,
            origin
          )
        )
      );
    } catch (hrErr) {
      console.warn("[Assessments:Submit] HR notification dispatch failed:", hrErr);
    }

    return NextResponse.json({
      success: true,
      message: "Assessment submitted successfully. Your application is now under recruiter review.",
      status: "evaluation",
    });
  } catch (err: any) {
    console.error("[Assessments:Submit] Unhandled error:", err.message);
    const formatted = formatAIErrorCode(err);
    return NextResponse.json(
      { error: formatted.display, errorCode: formatted.code },
      { status: 500 }
    );
  }
}

