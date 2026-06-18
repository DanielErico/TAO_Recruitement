import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { EmailService } from "@/lib/email-service";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;

  if (!role || !["recruiter", "admin"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { applicationId, status } = body;

    if (!applicationId || !status) {
      return NextResponse.json({ error: "Missing applicationId or status" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // If status is moved to 'interview', check if interview record exists
    if (status === "interview") {
      const { data: app } = await supabase
        .from("applications")
        .select("job_id, candidate_id")
        .eq("id", applicationId)
        .single();

      if (app) {
        // Create an interview invite if not exists
        const { data: existingInterview } = await supabase
          .from("interviews")
          .select("id")
          .eq("application_id", applicationId)
          .maybeSingle();

        if (!existingInterview) {
          await supabase
            .from("interviews")
            .insert({
              application_id: applicationId,
              job_id: app.job_id,
              candidate_id: app.candidate_id,
              status: "pending"
            });
        }
      }
    }

    const { data, error } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", applicationId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // ── Send email notifications based on new status ──
    if (data) {
      try {
        const { data: job } = await supabase
          .from("jobs")
          .select("title")
          .eq("id", data.job_id)
          .single();

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("full_name, email")
          .eq("id", data.candidate_id)
          .single();

        if (profile && job) {
          const candidateName = profile.full_name || "Candidate";
          const candidateEmail = profile.email;
          const jobTitle = job.title;

          if (status === "interview") {
            await EmailService.sendInterviewInvite(candidateEmail, candidateName, jobTitle, applicationId);
          } else if (status === "shortlisted") {
            await EmailService.sendShortlisted(candidateEmail, candidateName, jobTitle);
          } else if (status === "rejected") {
            await EmailService.sendRejection(candidateEmail, candidateName, jobTitle);
          }
        }
      } catch (err: any) {
        console.error("[Status API] Email notification flow failed:", err.message);
      }
    }

    return NextResponse.json({ success: true, application: data });
  } catch (err: any) {
    console.error("Status update failed:", err);
    return NextResponse.json({ error: err.message || "Failed to update status" }, { status: 500 });
  }
}
