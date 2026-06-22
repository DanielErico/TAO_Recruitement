"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface Props {
  overview: {
    totalApplicants: number;
    openJobs: number;
    inPipeline: { total: number };
    hired: number;
    rejected: number;
    avgAiScore: number;
  };
  funnel: { stage: string; count: number; conversion: number; dropOff: number }[];
  topSkills: { skill: string; count: number; percentage: number }[];
  jobsAnalytics: { title: string; applicants: number; hired: number; avgAiScore: number }[];
  qualityDist: { Excellent: number; Good: number; Average: number; Weak: number };
}

type InsightType = "positive" | "warning" | "info" | "negative";

interface Insight {
  type: InsightType;
  title: string;
  body: string;
  icon: React.ElementType;
}

function generateInsights(props: Props): Insight[] {
  const { overview, funnel, topSkills, jobsAnalytics, qualityDist } = props;
  const insights: Insight[] = [];

  // 1. Top skill insight
  if (topSkills.length > 0) {
    const top = topSkills[0];
    insights.push({
      type: "info",
      title: "Dominant Skill in Applicant Pool",
      body: `${top.percentage}% of applicants list "${top.skill}" as a skill, making it the most common in your talent pool. Roles requiring ${top.skill} have a strong candidate supply.`,
      icon: TrendingUp,
    });
  }

  // 2. Conversion rate insight
  const hiredStage = funnel.find((f) => f.stage === "Hired");
  if (hiredStage && hiredStage.conversion < 5 && overview.totalApplicants > 5) {
    insights.push({
      type: "warning",
      title: "Low Overall Hire Rate",
      body: `Only ${hiredStage.conversion}% of applicants reach the offer stage. Consider reviewing your screening criteria or increasing interview throughput to improve hire velocity.`,
      icon: AlertTriangle,
    });
  }

  // 3. Biggest drop-off stage
  const maxDropOff = funnel.reduce(
    (max, stage) => (stage.dropOff > max.dropOff ? stage : max),
    { stage: "", dropOff: 0, count: 0, conversion: 0 }
  );
  if (maxDropOff.dropOff > 30) {
    insights.push({
      type: "negative",
      title: `High Drop-Off at ${maxDropOff.stage}`,
      body: `${maxDropOff.dropOff}% of candidates are lost at the "${maxDropOff.stage}" stage. This may indicate a filtering bottleneck. Review your ${maxDropOff.stage.toLowerCase()} process for improvement opportunities.`,
      icon: TrendingDown,
    });
  }

  // 4. Best performing job
  const topJob = [...jobsAnalytics].sort((a, b) => b.avgAiScore - a.avgAiScore)[0];
  if (topJob && topJob.avgAiScore > 0) {
    insights.push({
      type: "positive",
      title: "Highest Quality Applicants",
      body: `The "${topJob.title}" role attracts the highest quality candidates with an average AI score of ${topJob.avgAiScore}/100 across ${topJob.applicants} applicants.`,
      icon: CheckCircle,
    });
  }

  // 5. AI score health
  if (overview.avgAiScore > 0) {
    if (overview.avgAiScore >= 70) {
      insights.push({
        type: "positive",
        title: "Strong Candidate Quality",
        body: `Your average AI score of ${overview.avgAiScore}/100 is above the 70-point benchmark, indicating generally well-qualified applicants across your open roles.`,
        icon: CheckCircle,
      });
    } else if (overview.avgAiScore < 55) {
      insights.push({
        type: "warning",
        title: "Below-Average CV Quality",
        body: `Average AI score of ${overview.avgAiScore}/100 suggests many candidates are not fully qualified. Consider refining job descriptions to attract more targeted applicants.`,
        icon: AlertTriangle,
      });
    }
  }

  // 6. Quality index distribution
  const totalQuality = Object.values(qualityDist).reduce((a, b) => a + b, 0);
  if (totalQuality > 0) {
    const excellentPct = Math.round((qualityDist.Excellent / totalQuality) * 100);
    if (excellentPct >= 20) {
      insights.push({
        type: "positive",
        title: "Strong Top-Tier Candidate Pipeline",
        body: `${excellentPct}% of analyzed candidates score in the "Excellent" quality tier. You have a healthy pool of high-potential candidates ready for fast-track consideration.`,
        icon: TrendingUp,
      });
    }
  }

  // 7. Pipeline health
  if (overview.inPipeline.total === 0 && overview.totalApplicants > 0) {
    insights.push({
      type: "warning",
      title: "Empty Active Pipeline",
      body: `You have ${overview.totalApplicants} total applicants but none are currently in active pipeline stages. Consider moving candidates forward or reviewing pending applications.`,
      icon: AlertTriangle,
    });
  }

  // Default if no insights generated
  if (insights.length === 0) {
    insights.push({
      type: "info",
      title: "More Data Needed",
      body: "Continue collecting applications and running AI analyses to generate meaningful recruitment insights. Insights improve with more data.",
      icon: Info,
    });
  }

  return insights;
}

const TYPE_STYLES: Record<InsightType, { card: string; icon: string }> = {
  positive: { card: "border-emerald-200 bg-emerald-50", icon: "text-emerald-600" },
  warning: { card: "border-amber-200 bg-amber-50", icon: "text-amber-600" },
  negative: { card: "border-red-200 bg-red-50", icon: "text-red-600" },
  info: { card: "border-blue-200 bg-blue-50", icon: "text-blue-600" },
};

export function AIRecommendations(props: Props) {
  const insights = generateInsights(props);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--color-brand)]" />
          <CardTitle className="text-base font-semibold">AI Recommendations</CardTitle>
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Auto-generated insights based on your recruitment data
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {insights.map((insight, i) => {
            const styles = TYPE_STYLES[insight.type];
            const Icon = insight.icon;
            return (
              <div key={i} className={`p-5 rounded-2xl border ${styles.card} transition-shadow hover:shadow-sm`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${styles.card} border-0 shrink-0`}>
                    <Icon size={16} className={`${styles.icon}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-foreground)] leading-snug mb-2">
                      {insight.title}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                      {insight.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
