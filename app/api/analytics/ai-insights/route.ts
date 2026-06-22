import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("candidate_ai_analysis")
    .select("overall_score, skills")
    .gt("overall_score", 0);

  if (!data || data.length === 0) {
    return NextResponse.json({
      avgScore: 0,
      maxScore: 0,
      minScore: 0,
      distribution: [],
      totalAnalyzed: 0,
    });
  }

  const scores = data.map((r: { overall_score: number }) => r.overall_score);
  const avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  // Score distribution in buckets of 10
  const buckets = [
    { range: "90-100", min: 90, max: 100 },
    { range: "80-89", min: 80, max: 89 },
    { range: "70-79", min: 70, max: 79 },
    { range: "60-69", min: 60, max: 69 },
    { range: "Below 60", min: 0, max: 59 },
  ];

  const distribution = buckets.map((b) => ({
    range: b.range,
    count: scores.filter((s: number) => s >= b.min && s <= b.max).length,
    percentage: Math.round(
      (scores.filter((s: number) => s >= b.min && s <= b.max).length / scores.length) * 100
    ),
  }));

  // Skills frequency
  const skillCount: Record<string, number> = {};
  data.forEach((r: { skills: string[] }) => {
    (r.skills || []).forEach((skill: string) => {
      const normalized = skill.trim();
      if (normalized) {
        skillCount[normalized] = (skillCount[normalized] || 0) + 1;
      }
    });
  });

  const topSkills = Object.entries(skillCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([skill, count]) => ({
      skill,
      count,
      percentage: Math.round((count / data.length) * 100),
    }));

  return NextResponse.json({
    avgScore,
    maxScore,
    minScore,
    distribution,
    totalAnalyzed: data.length,
    topSkills,
  });
}
