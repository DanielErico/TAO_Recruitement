import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();

  // Fetch all jobs with basic info
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, department:departments(name)")
    .order("created_at", { ascending: false });

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ jobs: [] });
  }

  // Fetch all applications
  const jobIds = jobs.map((j: { id: string }) => j.id);
  const { data: apps } = await supabase
    .from("applications")
    .select("job_id, status")
    .in("job_id", jobIds);

  // Fetch AI scores
  const { data: aiScores } = await supabase
    .from("candidate_ai_analysis")
    .select("job_id, overall_score")
    .in("job_id", jobIds)
    .gt("overall_score", 0);

  const appsByJob = (apps || []).reduce(
    (acc: Record<string, { status: string }[]>, a: { job_id: string; status: string }) => {
      if (!acc[a.job_id]) acc[a.job_id] = [];
      acc[a.job_id].push(a);
      return acc;
    },
    {}
  );

  const scoresByJob = (aiScores || []).reduce(
    (acc: Record<string, number[]>, a: { job_id: string; overall_score: number }) => {
      if (!acc[a.job_id]) acc[a.job_id] = [];
      acc[a.job_id].push(a.overall_score);
      return acc;
    },
    {}
  );

  const result = (jobs as any[]).map((job) => {
    const dept = Array.isArray(job.department) ? job.department[0]?.name : job.department?.name;
    const jobApps = appsByJob[job.id] || [];
    const jobScores = scoresByJob[job.id] || [];
    const avgScore =
      jobScores.length > 0
        ? Math.round(jobScores.reduce((a: number, b: number) => a + b, 0) / jobScores.length)
        : 0;

    return {
      id: job.id as string,
      title: job.title as string,
      department: (dept ?? "—") as string,
      applicants: jobApps.length,
      qualified: jobApps.filter((a: { status: string }) =>
        ["screening", "interview", "evaluation", "shortlisted", "offered"].includes(a.status)
      ).length,
      interviewed: jobApps.filter((a: { status: string }) =>
        ["interview", "evaluation", "shortlisted", "offered"].includes(a.status)
      ).length,
      hired: jobApps.filter((a: { status: string }) => a.status === "offered").length,
      avgAiScore: avgScore,
    };
  });

  return NextResponse.json({ jobs: result });
}
