import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { analyzeResume } from "@/lib/ai";
import { createRequire } from "module";
import { pathToFileURL } from "url";
// Mock global browser classes to prevent pdf-parse from crashing during Next.js build module evaluation
if (typeof global !== "undefined") {
  if (!(global as any).DOMMatrix) (global as any).DOMMatrix = class {};
  if (!(global as any).ImageData) (global as any).ImageData = class {};
  if (!(global as any).Path2D) (global as any).Path2D = class {};
}





export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for AI resume analysis (requires Vercel Pro)

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

  // 1. Resolve real candidate UUID
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
        return NextResponse.json({ error: "No candidate profile found in database." }, { status: 400 });
      }
      candidateId = anyCandidate.id;
    }
  }

  try {
    // 2. Parse Multipart Form Data
    const formData = await request.formData();
    const jobId = formData.get("jobId") as string;
    const coverLetter = formData.get("coverLetter") as string || "";
    const portfolioUrl = formData.get("portfolioUrl") as string || "";
    const resumeFile = formData.get("resume") as File | null;

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    // Check for duplicate application
    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "You have already applied for this position." }, { status: 409 });
    }

    // Fetch the job details for CV fit analysis
    const { data: job } = await supabase
      .from("jobs")
      .select("title, description, requirements")
      .eq("id", jobId)
      .single();

    if (!job) {
      return NextResponse.json({ error: "Job opening not found." }, { status: 404 });
    }

    let resumeUrl = null;
    let storagePath = null;
    let resumeText = "";
    let pdfExtractError: any = null;

    // 3. Upload CV to Storage
    if (resumeFile && resumeFile.size > 0) {
      const fileExtension = resumeFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
      storagePath = `${candidateId}/${fileName}`;

      const arrayBuffer = await resumeFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(storagePath, buffer, {
          contentType: resumeFile.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("Storage upload failed:", uploadError);
        return NextResponse.json({ error: `Resume upload failed: ${uploadError.message}` }, { status: 400 });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(storagePath);
      resumeUrl = urlData?.publicUrl || null;

      // Save document record
      await supabase.from("candidate_documents").insert({
        candidate_id: candidateId,
        file_name: resumeFile.name,
        file_size: resumeFile.size,
        file_type: resumeFile.type,
        storage_path: storagePath,
      });

      // 4. Extract PDF or plain text
      try {
        if (resumeFile.type === "application/pdf") {
          // Mock global browser classes to prevent pdfjs-dist from crashing in Node.js
          if (typeof global !== "undefined") {
            if (!(global as any).DOMMatrix) (global as any).DOMMatrix = class {};
            if (!(global as any).ImageData) (global as any).ImageData = class {};
            if (!(global as any).Path2D) (global as any).Path2D = class {};
          }
          // Dynamically import pdfjs-dist legacy build (pure JS, no native canvas required)
          const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
          const require = createRequire(import.meta.url);
          pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
            require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")
          ).toString();

          const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(buffer),
            useSystemFonts: true,
            disableFontFace: true,
          });
          const doc = await loadingTask.promise;
          let fullText = "";
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n";
          }
          resumeText = fullText;
        } else if (resumeFile.type === "text/plain" || resumeFile.type === "text/markdown") {
          resumeText = buffer.toString("utf-8");
        } else {
          resumeText = `Uploaded resume: ${resumeFile.name}. Extraction is simulated for non-PDF files.`;
        }
      } catch (err: any) {
        console.error("Failed to parse resume text:", err);
        pdfExtractError = {
          message: err.message,
          stack: err.stack,
          name: err.name
        };
        resumeText = `Fallback resume text for candidate. Resume file: ${resumeFile.name}`;
      }
    }

    if (!resumeText) {
      resumeText = coverLetter || "No resume text or cover letter provided.";
    }

    // 5. Run AI CV Analysis
    const analysis = await analyzeResume(resumeText, job.title, job.description, job.requirements);
    const fitScore = analysis.job_fit_score ?? 70;

    // Determine status based on CV fit score
    // If fit score is high (>= 75%), automatically invite to screening interview
    // Otherwise place in recruiter screening queue
    const applicationStatus = fitScore >= 75 ? "interview" : "screening";

    // 6. Insert Application
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

    if (appError) {
      throw appError;
    }

    // 7. Save CV Analysis report
    const { error: analysisError } = await supabase
      .from("cv_analyses")
      .insert({
        application_id: application.id,
        candidate_id: candidateId,
        job_id: jobId,
        full_name: analysis.full_name || null,
        email: analysis.email || null,
        phone: analysis.phone || null,
        location: analysis.location || null,
        skills: analysis.skills || [],
        education: analysis.education || [],
        certifications: analysis.certifications || [],
        work_experience: analysis.work_experience || [],
        professional_summary: analysis.professional_summary || "",
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        recommendations: analysis.recommendations || "",
        job_fit_score: fitScore,
        raw_json: {
          ...analysis,
          ...(pdfExtractError ? { pdf_extract_error: pdfExtractError } : {}),
        },
      });

    if (analysisError) {
      console.error("Warning: Failed to save CV analysis:", analysisError);
    }

    return NextResponse.json({
      success: true,
      application,
      realUserId: candidateId,
      status: applicationStatus,
      fitScore,
    });
  } catch (err: any) {
    console.error("Application submission failed:", err);
    return NextResponse.json({ error: err.message || "Failed to process application" }, { status: 500 });
  }
}
