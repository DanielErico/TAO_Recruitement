import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { subDays, format, eachDayOfInterval, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") || "30d";
  const supabase = createAdminClient();

  const days =
    range === "7d" ? 7 : range === "90d" ? 90 : range === "1y" ? 365 : 30;

  const since = subDays(new Date(), days).toISOString();

  const { data } = await supabase
    .from("applications")
    .select("applied_at")
    .gte("applied_at", since)
    .order("applied_at", { ascending: true });

  // Build a day-by-day map
  const allDays = eachDayOfInterval({
    start: subDays(new Date(), days),
    end: new Date(),
  });

  const countByDay: Record<string, number> = {};
  allDays.forEach((d) => {
    countByDay[format(startOfDay(d), "yyyy-MM-dd")] = 0;
  });

  (data || []).forEach((row: { applied_at: string }) => {
    const key = format(startOfDay(new Date(row.applied_at)), "yyyy-MM-dd");
    if (key in countByDay) countByDay[key] = (countByDay[key] || 0) + 1;
  });

  const trend = Object.entries(countByDay).map(([date, count]) => ({
    date,
    count,
  }));

  // Compute growth %: compare first half vs second half
  const midpoint = Math.floor(trend.length / 2);
  const firstHalf = trend.slice(0, midpoint).reduce((s, r) => s + r.count, 0);
  const secondHalf = trend.slice(midpoint).reduce((s, r) => s + r.count, 0);
  const growth =
    firstHalf === 0
      ? 100
      : Math.round(((secondHalf - firstHalf) / firstHalf) * 100);

  return NextResponse.json({ trend, growth });
}
