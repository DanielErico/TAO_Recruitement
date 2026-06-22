import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function parseYearsOfExperience(raw: string): number {
  if (!raw) return 0;
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (match) return parseFloat(match[1]);
  return 0;
}

export async function GET() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("candidate_ai_analysis")
    .select("years_of_experience, education, overall_score");

  if (!data || data.length === 0) {
    return NextResponse.json({
      experience: [],
      education: { degrees: [], levels: [] },
    });
  }

  // ── Experience Buckets ────────────────────────────────────
  const buckets = [
    { label: "0–1 Years", min: 0, max: 1 },
    { label: "2–4 Years", min: 2, max: 4 },
    { label: "5–8 Years", min: 5, max: 8 },
    { label: "9–12 Years", min: 9, max: 12 },
    { label: "12+ Years", min: 13, max: 99 },
  ];

  const experience = buckets.map((b) => ({
    label: b.label,
    count: data.filter((r: { years_of_experience: string }) => {
      const yrs = parseYearsOfExperience(r.years_of_experience);
      return yrs >= b.min && yrs <= b.max;
    }).length,
  }));

  // ── Education Parsing ─────────────────────────────────────
  const degreeCount: Record<string, number> = {};
  const levelCount: Record<string, number> = {};

  data.forEach((r: { education: Array<{ degree?: string; institution?: string }> | null }) => {
    const edu = r.education;
    if (!Array.isArray(edu)) return;
    edu.forEach((e) => {
      const degree = (e?.degree || "").trim();
      if (!degree) return;

      degreeCount[degree] = (degreeCount[degree] || 0) + 1;

      // Infer level
      const lower = degree.toLowerCase();
      if (lower.includes("phd") || lower.includes("doctorate")) {
        levelCount["PhD"] = (levelCount["PhD"] || 0) + 1;
      } else if (lower.includes("master") || lower.includes("msc") || lower.includes("mba")) {
        levelCount["Masters"] = (levelCount["Masters"] || 0) + 1;
      } else if (
        lower.includes("bachelor") ||
        lower.includes("bsc") ||
        lower.includes("b.sc") ||
        lower.includes("b.eng") ||
        lower.includes("b.tech")
      ) {
        levelCount["Bachelors"] = (levelCount["Bachelors"] || 0) + 1;
      } else if (lower.includes("diploma") || lower.includes("hnd") || lower.includes("ond")) {
        levelCount["Diploma"] = (levelCount["Diploma"] || 0) + 1;
      } else {
        levelCount["Other"] = (levelCount["Other"] || 0) + 1;
      }
    });
  });

  const total = data.length;

  const degrees = Object.entries(degreeCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([degree, count]) => ({
      degree,
      count,
      percentage: Math.round((count / total) * 100),
    }));

  const levels = Object.entries(levelCount)
    .sort(([, a], [, b]) => b - a)
    .map(([level, count]) => ({
      level,
      count,
      percentage: Math.round((count / total) * 100),
    }));

  return NextResponse.json({ experience, education: { degrees, levels } });
}
