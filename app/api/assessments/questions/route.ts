/**
 * TAO Recruit AI — GET /api/assessments/questions
 * ============================================================
 * Retrieves the role-tailored online recruitment assessment questions
 * for a specific application.
 *
 * Query params: ?applicationId=string
 * Auth: Candidate (application owner) or Recruiter/Admin
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateRoleAssessment } from "@/lib/assessment-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch application & job details
    const { data: application, error: appError } = await admin
      .from("applications")
      .select(`
        id,
        status,
        candidate_id,
        job_id,
        job:jobs (
          id,
          title,
          description,
          responsibilities,
          requirements,
          skills_required,
          department:departments (name)
        )
      `)
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Role check: candidate must own application unless recruiter or admin
    if (application.candidate_id !== user.id) {
      const { data: profile } = await admin
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || !["admin", "recruiter"].includes(profile.role)) {
        return NextResponse.json({ error: "Forbidden: Not your application" }, { status: 403 });
      }
    }

    const job = application.job as any;
    if (!job) {
      return NextResponse.json({ error: "Associated job not found" }, { status: 404 });
    }

    const assessmentSet = await getOrCreateRoleAssessment({
      id: job.id,
      title: job.title,
      department: job.department?.name,
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      skills_required: job.skills_required,
      organisation: "The Agriculture Option (TAO)",
    });

    return NextResponse.json({
      success: true,
      assessment: assessmentSet,
      applicationId: application.id,
      applicationStatus: application.status,
    });
  } catch (err: any) {
    console.error("[Assessments:Questions] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to load assessment questions" },
      { status: 500 }
    );
  }
}

