/**
 * TAO Recruit AI — POST /api/applications/reanalyze
 * ============================================================
 * Allows a recruiter to trigger a fresh AI analysis for a
 * specific application. Deletes the existing analysis record
 * and re-runs the full CV extraction + AI pipeline.
 *
 * Body: { applicationId: string }
 * Auth: recruiter or admin only
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { analyzeCV } from "@/lib/ai";
import { extractCVText } from "@/lib/cv-extractor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // ── Auth check — recruiter/admin only ────────────────────────
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;

  if (!role) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  if (!["recruiter", "admin"].includes(role)) {
    return NextResponse.json({ error: "Only recruiters can trigger re-analysis." }, { status: 403 });
  }

  const { applicationId } = await request.json();

  if (!applicationId) {
    return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ── Fetch application + job details ─────────────────────────
  const { data: application } = await supabase
    .from("applications")
    .select(`
      id,
      candidate_id,
      job_id,
      resume_url,
      job:jobs (title, description, requirements)
    `)
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  const job = application.job as any;
  if (!job) {
    return NextResponse.json({ error: "Associated job not found." }, { status: 404 });
  }

  // ── Download CV from Supabase Storage ────────────────────────
  if (!application.resume_url) {
    return NextResponse.json(
      { error: "CV file unavailable — no resume URL found for this application." },
      { status: 400 }
    );
  }

  // Fetch the CV file bytes from the public URL
  let cvBuffer: Buffer;
  let cvMimeType = "application/pdf";
  let cvFileName = "resume.pdf";

  try {
    const fileResponse = await fetch(application.resume_url);
    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: `CV file inaccessible — HTTP ${fileResponse.status} when fetching from storage.` },
        { status: 400 }
      );
    }

    const contentType = fileResponse.headers.get("content-type") || "application/pdf";
    cvMimeType = contentType.split(";")[0].trim();

    // Derive filename from URL
    const urlParts = application.resume_url.split("/");
    cvFileName = decodeURIComponent(urlParts[urlParts.length - 1] || "resume");

    const arrayBuffer = await fileResponse.arrayBuffer();
    cvBuffer = Buffer.from(arrayBuffer);

    console.log(`[Reanalyze] Downloaded CV: ${cvFileName} (${cvBuffer.length} bytes)`);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to download CV file: ${err.message}` },
      { status: 500 }
    );
  }

  // ── Extract CV text ──────────────────────────────────────────
  const extraction = await extractCVText(cvBuffer, cvMimeType, cvFileName);

  console.log(
    `[Reanalyze] Extraction: status=${extraction.status} chars=${extraction.charCount}`,
    extraction.error ? `error=${extraction.error}` : ""
  );

  // ── Run AI Analysis ──────────────────────────────────────────
  let aiAnalysis: Awaited<ReturnType<typeof analyzeCV>> | null = null;
  let aiError: string | undefined;

  if (extraction.status === "success" && extraction.text) {
    try {
      aiAnalysis = await analyzeCV(
        extraction.text,
        job.title,
        job.description,
        job.requirements
      );
    } catch (err: any) {
      console.error("[Reanalyze] AI analysis failed:", err.message);
      aiError = err.message;
    }
  }

  if (aiError) {
    return NextResponse.json(
      { error: `AI Analysis failed: ${aiError}` },
      { status: 500 }
    );
  }

  // ── Upsert candidate_ai_analysis (replace existing) ──────────
  const { error: upsertError } = await supabase
    .from("candidate_ai_analysis")
    .upsert(
      {
        application_id: application.id,
        candidate_id: application.candidate_id,
        job_id: application.job_id,
        extracted_text: extraction.text,
        extraction_status: extraction.status,
        extraction_error: extraction.error ?? null,
        professional_summary: aiAnalysis?.professional_summary ?? "",
        skills: aiAnalysis?.skills ?? [],
        strengths: aiAnalysis?.strengths ?? [],
        risks: aiAnalysis?.risks ?? [],
        years_of_experience: aiAnalysis?.years_of_experience ?? "",
        work_experience: aiAnalysis?.work_experience ?? [],
        education: aiAnalysis?.education ?? [],
        certifications: aiAnalysis?.certifications ?? [],
        recommended_role_fit: aiAnalysis?.recommended_role_fit ?? "",
        overall_score: aiAnalysis?.overall_score ?? 0,
        ai_model: "meta/llama-3.3-70b-instruct",
        analyzed_at: aiAnalysis ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "application_id" }
    );

  if (upsertError) {
    console.error("[Reanalyze] Failed to save analysis:", upsertError);
    return NextResponse.json(
      { error: `Failed to save re-analysis results: ${upsertError.message}` },
      { status: 500 }
    );
  }

  // ── Also update cv_analyses for backward compat ──────────────
  if (aiAnalysis) {
    await supabase
      .from("cv_analyses")
      .upsert(
        {
          application_id: application.id,
          candidate_id: application.candidate_id,
          job_id: application.job_id,
          full_name: null,
          email: null,
          phone: null,
          location: null,
          skills: aiAnalysis.skills,
          education: aiAnalysis.education.map((e) => ({
            institution: e.institution,
            degree: e.degree,
            field: "",
            graduation_year: e.year,
          })),
          certifications: aiAnalysis.certifications,
          work_experience: aiAnalysis.work_experience.map((w) => ({
            company: w.company,
            title: w.job_title,
            start_date: "",
            end_date: "",
            current: false,
            description: w.responsibilities.join(" "),
          })),
          professional_summary: aiAnalysis.professional_summary,
          strengths: aiAnalysis.strengths,
          weaknesses: aiAnalysis.risks,
          recommendations: `Role fit: ${aiAnalysis.recommended_role_fit}`,
          job_fit_score: aiAnalysis.overall_score,
          raw_json: {
            source: "reanalyze",
            reanalyzed_at: new Date().toISOString(),
            overall_score: aiAnalysis.overall_score,
          },
        },
        { onConflict: "application_id" }
      );
  }

  return NextResponse.json({
    success: true,
    extractionStatus: extraction.status,
    charCount: extraction.charCount,
    score: aiAnalysis?.overall_score ?? 0,
    roleFit: aiAnalysis?.recommended_role_fit ?? "",
    ...(extraction.error ? { extractionError: extraction.error } : {}),
    ...(aiError ? { aiError } : {}),
  });
}
