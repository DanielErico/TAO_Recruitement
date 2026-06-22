import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();

  const [
    totalAppsRes,
    openJobsRes,
    pipelineRes,
    hiredRes,
    rejectedRes,
    aiScoreRes,
  ] = await Promise.all([
    supabase.from("applications").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase
      .from("applications")
      .select("status")
      .in("status", ["screening", "interview", "evaluation", "shortlisted"]),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "offered"),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),
    supabase
      .from("candidate_ai_analysis")
      .select("overall_score")
      .gt("overall_score", 0),
  ]);

  const pipeline = (pipelineRes.data || []).reduce(
    (acc: Record<string, number>, row: { status: string }) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    {}
  );

  const scores = (aiScoreRes.data || []).map((r: { overall_score: number }) => r.overall_score);
  const avgAiScore = scores.length > 0
    ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
    : 0;

  return NextResponse.json({
    totalApplicants: totalAppsRes.count ?? 0,
    openJobs: openJobsRes.count ?? 0,
    inPipeline: {
      screening: pipeline["screening"] ?? 0,
      interview: pipeline["interview"] ?? 0,
      evaluation: pipeline["evaluation"] ?? 0,
      shortlisted: pipeline["shortlisted"] ?? 0,
      total: Object.values(pipeline).reduce((a, b) => a + b, 0),
    },
    hired: hiredRes.count ?? 0,
    rejected: rejectedRes.count ?? 0,
    avgAiScore,
  });
}
