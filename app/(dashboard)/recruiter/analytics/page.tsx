import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300; // Revalidate every 5 minutes
export const metadata: Metadata = { title: "Recruitment Analytics | TAO" };

async function fetchData(path: string, baseUrl: string) {
  try {
    const res = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role;

  if (!role) redirect("/login");
  if (!["recruiter", "admin"].includes(role)) redirect("/candidate");

  // Run analytics queries sequentially to bypass local DNS & SSL handshake connection locks
  const appsRes = await supabase.from("applications").select("id, status, applied_at, job_id");
  const jobsRes = await supabase.from("jobs").select("id, title, status, created_by, department:departments(name)").order("created_at", { ascending: false });
  const aiRes = await supabase.from("candidate_ai_analysis").select("job_id, overall_score, skills, years_of_experience, education");
  const recruitersRes = await supabase.from("user_profiles").select("id, full_name, email").in("role", ["recruiter", "admin"]);

  const allApps = appsRes.data || [];
  const allJobsData = jobsRes.data || [];
  const aiData = aiRes.data || [];
  const recruitersList = recruitersRes.data || [];

  const stage = (s: string) => allApps.filter((r: { status: string }) => r.status === s).length;

  const pipeline = {
    screening: stage("screening"),
    interview: stage("interview"),
    evaluation: stage("evaluation"),
    shortlisted: stage("shortlisted"),
    total: allApps.filter((r: { status: string }) =>
      ["screening", "interview", "evaluation", "shortlisted"].includes(r.status)
    ).length,
  };

  const scores = aiData.map((r: { overall_score: number }) => r.overall_score).filter((s: number) => s > 0);
  const avgAiScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;

  const overview = {
    totalApplicants: allApps.length,
    openJobs: allJobsData.filter(j => j.status === "published").length,
    inPipeline: pipeline,
    hired: stage("offered"),
    rejected: stage("rejected"),
    avgAiScore,
  };

  // Funnel
  const total = allApps.length;
  const conv = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const drop = (n: number, prev: number) => (prev === 0 ? 0 : Math.round(((prev - n) / prev) * 100));
  const applied = total;
  const screening = stage("screening");
  const interview = stage("interview");
  const evaluation = stage("evaluation");
  const shortlisted = stage("shortlisted");
  const offered = stage("offered");

  const funnel = [
    { stage: "Applied", count: applied, conversion: 100, dropOff: 0 },
    { stage: "Screening", count: screening, conversion: conv(screening), dropOff: drop(screening, applied) },
    { stage: "Interview", count: interview, conversion: conv(interview), dropOff: drop(interview, screening) },
    { stage: "Assessment", count: evaluation, conversion: conv(evaluation), dropOff: drop(evaluation, interview) },
    { stage: "Final Review", count: shortlisted, conversion: conv(shortlisted), dropOff: drop(shortlisted, evaluation) },
    { stage: "Hired", count: offered, conversion: conv(offered), dropOff: drop(offered, shortlisted) },
  ];

  // AI Score distribution
  const buckets = [
    { range: "90-100", min: 90, max: 100 },
    { range: "80-89", min: 80, max: 89 },
    { range: "70-79", min: 70, max: 79 },
    { range: "60-69", min: 60, max: 69 },
    { range: "Below 60", min: 0, max: 59 },
  ];
  const scoreDistribution = buckets.map((b) => ({
    range: b.range,
    count: scores.filter((s: number) => s >= b.min && s <= b.max).length,
    percentage: scores.length === 0 ? 0 : Math.round((scores.filter((s: number) => s >= b.min && s <= b.max).length / scores.length) * 100),
  }));

  // Skills
  const skillCount: Record<string, number> = {};
  aiData.forEach((r: { skills: string[] }) => {
    (r.skills || []).forEach((skill: string) => {
      const s = skill.trim();
      if (s) skillCount[s] = (skillCount[s] || 0) + 1;
    });
  });
  const topSkills = Object.entries(skillCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([skill, count]) => ({
      skill,
      count,
      percentage: aiData.length === 0 ? 0 : Math.round((count / aiData.length) * 100),
    }));

  // Experience buckets
  function parseExp(raw: string): number {
    if (!raw) return 0;
    const match = raw.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }
  const expBuckets = [
    { label: "0–1 Years", min: 0, max: 1 },
    { label: "2–4 Years", min: 2, max: 4 },
    { label: "5–8 Years", min: 5, max: 8 },
    { label: "9–12 Years", min: 9, max: 12 },
    { label: "12+ Years", min: 13, max: 99 },
  ];
  const experience = expBuckets.map((b) => ({
    label: b.label,
    count: aiData.filter((r: { years_of_experience: string }) => {
      const y = parseExp(r.years_of_experience);
      return y >= b.min && y <= b.max;
    }).length,
  }));

  // Education
  const degreeCount: Record<string, number> = {};
  const levelCount: Record<string, number> = {};
  aiData.forEach((r: { education: any }) => {
    if (!Array.isArray(r.education)) return;
    r.education.forEach((e) => {
      const degree = (e?.degree || "").trim();
      if (!degree) return;
      degreeCount[degree] = (degreeCount[degree] || 0) + 1;
      const lower = degree.toLowerCase();
      if (lower.includes("phd") || lower.includes("doctorate")) levelCount["PhD"] = (levelCount["PhD"] || 0) + 1;
      else if (lower.includes("master") || lower.includes("msc") || lower.includes("mba")) levelCount["Masters"] = (levelCount["Masters"] || 0) + 1;
      else if (lower.includes("bachelor") || lower.includes("bsc") || lower.includes("b.sc") || lower.includes("b.eng")) levelCount["Bachelors"] = (levelCount["Bachelors"] || 0) + 1;
      else if (lower.includes("diploma") || lower.includes("hnd") || lower.includes("ond")) levelCount["Diploma"] = (levelCount["Diploma"] || 0) + 1;
      else levelCount["Other"] = (levelCount["Other"] || 0) + 1;
    });
  });
  const degrees = Object.entries(degreeCount).sort(([, a], [, b]) => b - a).slice(0, 8).map(([degree, count]) => ({ degree, count, percentage: aiData.length === 0 ? 0 : Math.round((count / aiData.length) * 100) }));
  const levels = Object.entries(levelCount).sort(([, a], [, b]) => b - a).map(([level, count]) => ({ level, count, percentage: aiData.length === 0 ? 0 : Math.round((count / aiData.length) * 100) }));

  // Jobs with aggregated stats
  const appsByJob: Record<string, { status: string }[]> = {};
  allApps.forEach((a) => {
    if (!appsByJob[a.job_id]) appsByJob[a.job_id] = [];
    appsByJob[a.job_id].push(a);
  });
  const scoresByJob: Record<string, number[]> = {};
  aiData.forEach((a) => {
    if (a.overall_score > 0) {
      if (!scoresByJob[a.job_id]) scoresByJob[a.job_id] = [];
      scoresByJob[a.job_id].push(a.overall_score);
    }
  });

  const jobsAnalytics = (allJobsData as any[]).map((job) => {
    const dept = Array.isArray(job.department) ? job.department[0]?.name : job.department?.name;
    const ja = appsByJob[job.id] || [];
    const js = scoresByJob[job.id] || [];
    return {
      id: job.id as string,
      title: job.title as string,
      department: (dept ?? "—") as string,
      applicants: ja.length,
      qualified: ja.filter((a: { status: string }) => ["screening", "interview", "evaluation", "shortlisted", "offered"].includes(a.status)).length,
      interviewed: ja.filter((a: { status: string }) => ["interview", "evaluation", "shortlisted", "offered"].includes(a.status)).length,
      hired: ja.filter((a: { status: string }) => a.status === "offered").length,
      avgAiScore: js.length > 0 ? Math.round(js.reduce((a: number, b: number) => a + b, 0) / js.length) : 0,
    };
  });

  // Recruiters
  const recJobIds: Record<string, string[]> = {};
  allJobsData.forEach((j: { id: string; created_by: string }) => {
    if (j.created_by) {
      if (!recJobIds[j.created_by]) recJobIds[j.created_by] = [];
      recJobIds[j.created_by].push(j.id);
    }
  });

  const recruiters = recruitersList.map((r: { id: string; full_name: string; email: string }) => {
    const myJobs = recJobIds[r.id] || [];
    const myApps = myJobs.flatMap((jid: string) => appsByJob[jid] || []);
    return {
      id: r.id,
      name: r.full_name,
      email: r.email,
      jobsPosted: myJobs.length,
      applicationsReviewed: myApps.filter((a: { status: string }) => !["applied"].includes(a.status)).length,
      interviewed: myApps.filter((a: { status: string }) => ["interview", "evaluation", "shortlisted", "offered"].includes(a.status)).length,
      hired: myApps.filter((a: { status: string }) => a.status === "offered").length,
    };
  }).sort((a: { applicationsReviewed: number }, b: { applicationsReviewed: number }) => b.applicationsReviewed - a.applicationsReviewed);

  // 30-day trend
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const trendApps = allApps.filter((a: { applied_at: string }) => new Date(a.applied_at) >= thirtyDaysAgo);
  const trendByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    trendByDay[key] = 0;
  }
  trendApps.forEach((a: { applied_at: string }) => {
    const key = a.applied_at.slice(0, 10);
    if (key in trendByDay) trendByDay[key]++;
  });
  const trend = Object.entries(trendByDay).map(([date, count]) => ({ date, count }));

  // Quality Index
  const qualityIndex = aiData.map((r: { overall_score: number; years_of_experience: string; skills: string[] }) => {
    const aiScore = r.overall_score * 0.4;
    const expYears = parseExp(r.years_of_experience);
    const expScore = Math.min(expYears / 10, 1) * 30;
    const skillScore = Math.min((r.skills || []).length / 10, 1) * 20;
    const total = aiScore + expScore + skillScore;
    if (total >= 75) return "Excellent";
    if (total >= 55) return "Good";
    if (total >= 35) return "Average";
    return "Weak";
  });
  const qualityDist = {
    Excellent: qualityIndex.filter((q: string) => q === "Excellent").length,
    Good: qualityIndex.filter((q: string) => q === "Good").length,
    Average: qualityIndex.filter((q: string) => q === "Average").length,
    Weak: qualityIndex.filter((q: string) => q === "Weak").length,
  };

  return (
    <AnalyticsDashboard
      overview={overview}
      funnel={funnel}
      trend={trend}
      jobsAnalytics={jobsAnalytics}
      aiInsights={{ avgScore: avgAiScore, maxScore, minScore, distribution: scoreDistribution, totalAnalyzed: aiData.length }}
      topSkills={topSkills}
      experience={experience}
      education={{ degrees, levels }}
      recruiters={recruiters}
      qualityDist={qualityDist}
    />
  );
}
