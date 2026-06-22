import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();

  const { data: counts } = await supabase
    .from("applications")
    .select("status");

  const all = counts || [];
  const total = all.length;

  const stage = (status: string) =>
    all.filter((r: { status: string }) => r.status === status).length;

  const applied = total;
  const screening = stage("screening");
  const interview = stage("interview");
  const evaluation = stage("evaluation");
  const shortlisted = stage("shortlisted");
  const offered = stage("offered");

  const convRate = (n: number, denom: number) =>
    denom === 0 ? 0 : Math.round((n / denom) * 100);

  const dropOff = (n: number, prev: number) =>
    prev === 0 ? 0 : Math.round(((prev - n) / prev) * 100);

  const funnel = [
    { stage: "Applied", count: applied, conversion: 100, dropOff: 0 },
    {
      stage: "Screening",
      count: screening,
      conversion: convRate(screening, applied),
      dropOff: dropOff(screening, applied),
    },
    {
      stage: "Interview",
      count: interview,
      conversion: convRate(interview, applied),
      dropOff: dropOff(interview, screening),
    },
    {
      stage: "Assessment",
      count: evaluation,
      conversion: convRate(evaluation, applied),
      dropOff: dropOff(evaluation, interview),
    },
    {
      stage: "Final Review",
      count: shortlisted,
      conversion: convRate(shortlisted, applied),
      dropOff: dropOff(shortlisted, evaluation),
    },
    {
      stage: "Hired",
      count: offered,
      conversion: convRate(offered, applied),
      dropOff: dropOff(offered, shortlisted),
    },
  ];

  return NextResponse.json({ funnel });
}
