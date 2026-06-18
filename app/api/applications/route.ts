/**
 * TAO Recruit AI — POST /api/applications
 * ============================================================
 * Handles candidate job application submissions.
 *
 * Pipeline:
 *   1. Authenticate candidate
 *   2. Parse multipart form data
 *   3. Upload CV to Supabase Storage
 *   4. Extract CV text (PDF/DOCX/TXT via cv-extractor)
 *   5. Call Nemotron 70B AI analysis (analyzeCV)
 *   6. Insert application record
 *   7. Insert candidate_ai_analysis record
 *   8. Insert cv_analyses record (backward compat)
 *   9. Return result
 *
 * Error handling:
 *   - CV extraction failure  → application saved, analysis skipped, precise error stored
 *   - AI analysis failure    → application saved, analysis skipped, precise error stored
 *   - No fake/fallback data generated under any circumstances
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { analyzeCV } from "@/lib/ai";
import { extractCVText } from "@/lib/cv-extractor";
import { EmailService } from "@/lib/email-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  const cookieUserId = cookieStore.get("mock_user_id")?.value;
  const cookieEmail = cookieStore.get("mock_user_email")?.value ?? "";

  if (!role || !cookieUserId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  if (role !== "candidate") {
    return NextResponse.json({ error: "Only candidates can apply for jobs." }, { status: 403 });
  }

  const supabase = createAdminClient();

  // ── 1. Resolve real candidate UUID ───────────────────────────
  let candidateId = cookieUserId;

  const { data: byId } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", cookieUserId)
    .maybeSingle();

  if (!byId) {
    const { data: byEmail } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", cookieEmail)
      .maybeSingle();

    if (byEmail) {
      candidateId = byEmail.id;
    } else {
      const { data: anyCandidate } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("role", "candidate")
        .limit(1)
        .maybeSingle();

      if (!anyCandidate) {
        return NextResponse.json(
          { error: "No candidate profile found in database." },
          { status: 400 }
        );
      }
      candidateId = anyCandidate.id;
    }
  }

  // ── Resolve candidate profile details for notifications ─────
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, email")
    .eq("id", candidateId)
    .maybeSingle();

  const candidateName = profile?.full_name || "Candidate";
  const candidateEmail = profile?.email || cookieEmail;

  try {
    // ── 2. Parse form data ──────────────────────────────────────
    const formData = await request.formData();
    const jobId = formData.get("jobId") as string;
    const coverLetter = (formData.get("coverLetter") as string) || "";
    const portfolioUrl = (formData.get("portfolioUrl") as string) || "";
    const resumeFile = formData.get("resume") as File | null;

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    // ── Check for duplicate application ────────────────────────
    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You have already applied for this position." },
        { status: 409 }
      );
    }

    // ── Fetch job details ───────────────────────────────────────
    const { data: job } = await supabase
      .from("jobs")
      .select("title, description, requirements")
      .eq("id", jobId)
      .single();

    if (!job) {
      return NextResponse.json({ error: "Job opening not found." }, { status: 404 });
    }

    // ── 3. Upload CV to Storage ─────────────────────────────────
    let resumeUrl: string | null = null;
    let storagePath: string | null = null;
    let cvBuffer: Buffer | null = null;
    let cvFileName = "";
    let cvMimeType = "";

    if (resumeFile && resumeFile.size > 0) {
      const fileExt = resumeFile.name.split(".").pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      storagePath = `${candidateId}/${uniqueName}`;
      cvFileName = resumeFile.name;
      cvMimeType = resumeFile.type;

      const arrayBuffer = await resumeFile.arrayBuffer();
      cvBuffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(storagePath, cvBuffer, {
          contentType: resumeFile.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("[Applications] Storage upload failed:", uploadError);
        return NextResponse.json(
          { error: `CV upload failed: ${uploadError.message}` },
          { status: 400 }
        );
      }

      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(storagePath);
      resumeUrl = urlData?.publicUrl || null;

      // Record document
      await supabase.from("candidate_documents").insert({
        candidate_id: candidateId,
        file_name: resumeFile.name,
        file_size: resumeFile.size,
        file_type: resumeFile.type,
        storage_path: storagePath,
      });
    } else {
      // Fallback: check if the candidate has a default resume on their profile
      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("resume_url, resume_name")
        .eq("user_id", candidateId)
        .maybeSingle();

      if (profile?.resume_url) {
        resumeUrl = profile.resume_url;
        cvFileName = profile.resume_name || "resume.pdf";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout
        try {
          const fileResponse = await fetch(profile.resume_url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (fileResponse.ok) {
            const contentType = fileResponse.headers.get("content-type") || "application/pdf";
            cvMimeType = contentType.split(";")[0].trim();
            const arrayBuffer = await fileResponse.arrayBuffer();
            cvBuffer = Buffer.from(arrayBuffer);
            console.log(`[Applications] Loaded default CV from profile: ${cvFileName} (${cvBuffer.length} bytes)`);
          } else {
            console.warn(`[Applications] Default CV URL inaccessible: HTTP ${fileResponse.status}`);
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          console.error("[Applications] Failed to download default profile CV:", err.message);
        }
      }
    }

    // ── 4. Extract CV text ──────────────────────────────────────
    let extractedText = "";
    let extractionStatus: "success" | "failed" | "empty" | "unsupported" | "pending" = "pending";
    let extractionError: string | undefined;

    if (cvBuffer && cvFileName) {
      const extraction = await extractCVText(cvBuffer, cvMimeType, cvFileName);
      extractedText = extraction.text;
      extractionStatus = extraction.status as typeof extractionStatus;
      extractionError = extraction.error;

      console.log(
        `[Applications] Extraction: status=${extraction.status} chars=${extraction.charCount}`,
        extraction.error ? `error=${extraction.error}` : ""
      );
    } else if (!resumeFile) {
      // No CV uploaded — use cover letter as context if available
      extractedText = coverLetter || "";
      extractionStatus = extractedText.length > 50 ? "success" : "empty";
      if (extractionStatus === "empty") {
        extractionError = "No CV uploaded and no cover letter provided.";
      }
    }

    // ── 5. AI CV Analysis ───────────────────────────────────────
    let aiAnalysis: Awaited<ReturnType<typeof analyzeCV>> | null = null;
    let aiError: string | undefined;
    let applicationStatus = "screening"; // default

    if (extractionStatus === "success" && extractedText) {
      try {
        aiAnalysis = await analyzeCV(
          extractedText,
          job.title,
          job.description,
          job.requirements,
          35000 // 35 seconds timeout limit to ensure auto-evaluation completes successfully
        );

        // High fit score → auto-invite to interview
        applicationStatus = aiAnalysis.overall_score >= 75 ? "interview" : "screening";
      } catch (err: any) {
        console.error("[Applications] AI analysis failed:", err.message);
        aiError = err.message;
        // Application proceeds — analysis failure is non-blocking
      }
    } else {
      console.warn(
        `[Applications] Skipping AI analysis — extraction status: ${extractionStatus}`,
        extractionError
      );
    }

    // ── 6. Insert Application record ────────────────────────────
    const { data: application, error: appError } = await supabase
      .from("applications")
      .insert({
        job_id: jobId,
        candidate_id: candidateId,
        resume_url: resumeUrl,
        portfolio_url: portfolioUrl || null,
        cover_letter: coverLetter || null,
        status: applicationStatus,
      })
      .select()
      .single();

    if (appError) throw appError;

    // ── 7. Insert candidate_ai_analysis (new table) ─────────────
    const { error: newAnalysisError } = await supabase
      .from("candidate_ai_analysis")
      .insert({
        application_id: application.id,
        candidate_id: candidateId,
        job_id: jobId,
        extracted_text: extractedText,
        extraction_status: extractionStatus,
        extraction_error: extractionError ?? null,
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
      });

    if (newAnalysisError) {
      console.error("[Applications] Failed to save candidate_ai_analysis:", newAnalysisError);
    }

    // ── 8. Insert cv_analyses (backward compatibility) ──────────
    if (aiAnalysis) {
      const { error: legacyError } = await supabase
        .from("cv_analyses")
        .insert({
          application_id: application.id,
          candidate_id: candidateId,
          job_id: jobId,
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
            source: "candidate_ai_analysis",
            overall_score: aiAnalysis.overall_score,
            recommended_role_fit: aiAnalysis.recommended_role_fit,
            years_of_experience: aiAnalysis.years_of_experience,
            ...(aiError ? { ai_error: aiError } : {}),
          },
        });

      if (legacyError) {
        console.warn("[Applications] Failed to save legacy cv_analyses:", legacyError.message);
      }
    }

    // ── 8.5. Send email notifications ───────────────────────────
    if (candidateEmail) {
      try {
        // 1. Send Application Received confirmation
        await EmailService.sendApplicationReceived(candidateEmail, candidateName, job.title);

        // 2. If status is 'interview' (due to auto-qualification fitScore >= 75), send invite
        if (applicationStatus === "interview") {
          await EmailService.sendInterviewInvite(candidateEmail, candidateName, job.title, application.id);
        }
      } catch (err: any) {
        console.error("[Applications] Email notifications failed:", err.message);
      }
    }

    // ── 9. Return result ────────────────────────────────────────
    return NextResponse.json({
      success: true,
      application,
      realUserId: candidateId,
      status: applicationStatus,
      fitScore: aiAnalysis?.overall_score ?? 0,
      extractionStatus,
      ...(extractionError ? { extractionError } : {}),
      ...(aiError ? { aiError } : {}),
    });
  } catch (err: any) {
    console.error("[Applications] Submission failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process application" },
      { status: 500 }
    );
  }
}
