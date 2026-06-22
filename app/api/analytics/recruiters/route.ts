import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();

  // Fetch all recruiters
  const { data: recruiters } = await supabase
    .from("user_profiles")
    .select("id, full_name, email")
    .in("role", ["recruiter", "admin"]);

  if (!recruiters || recruiters.length === 0) {
    return NextResponse.json({ recruiters: [] });
  }

  const recruiterIds = recruiters.map((r: { id: string }) => r.id);

  // Fetch jobs created by these recruiters (as a proxy for activity)
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, created_by")
    .in("created_by", recruiterIds);

  const jobsByRecruiter: Record<string, string[]> = {};
  (jobs || []).forEach((j: { id: string; created_by: string }) => {
    if (!jobsByRecruiter[j.created_by]) jobsByRecruiter[j.created_by] = [];
    jobsByRecruiter[j.created_by].push(j.id);
  });

  // Fetch all applications for those jobs
  const allJobIds = (jobs || []).map((j: { id: string }) => j.id);
  const { data: apps } =
    allJobIds.length > 0
      ? await supabase.from("applications").select("job_id, status")
      : { data: [] };

  const appsByJob: Record<string, { status: string }[]> = {};
  (apps || []).forEach((a: { job_id: string; status: string }) => {
    if (!appsByJob[a.job_id]) appsByJob[a.job_id] = [];
    appsByJob[a.job_id].push(a);
  });

  const result = recruiters.map(
    (r: { id: string; full_name: string; email: string }) => {
      const myJobs = jobsByRecruiter[r.id] || [];
      const myApps = myJobs.flatMap((jid) => appsByJob[jid] || []);
      return {
        id: r.id,
        name: r.full_name,
        email: r.email,
        jobsPosted: myJobs.length,
        applicationsReviewed: myApps.filter((a) =>
          ["screening", "interview", "evaluation", "shortlisted", "offered", "rejected"].includes(
            a.status
          )
        ).length,
        interviewed: myApps.filter((a) =>
          ["interview", "evaluation", "shortlisted", "offered"].includes(a.status)
        ).length,
        hired: myApps.filter((a) => a.status === "offered").length,
      };
    }
  );

  // Sort by applicationsReviewed desc
  result.sort(
    (
      a: { applicationsReviewed: number },
      b: { applicationsReviewed: number }
    ) => b.applicationsReviewed - a.applicationsReviewed
  );

  return NextResponse.json({ recruiters: result });
}
