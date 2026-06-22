"use client";

import { Users, Briefcase, GitPullRequest, UserCheck, UserX, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  overview: {
    totalApplicants: number;
    openJobs: number;
    inPipeline: { screening: number; interview: number; evaluation: number; shortlisted: number; total: number };
    hired: number;
    rejected: number;
    avgAiScore: number;
  };
}

export function KpiCards({ overview }: Props) {
  const { totalApplicants, openJobs, inPipeline, hired, rejected, avgAiScore } = overview;

  const cards = [
    {
      label: "Total Applicants",
      value: totalApplicants.toLocaleString(),
      icon: Users,
      desc: "All candidates who applied",
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Active Job Openings",
      value: openJobs.toLocaleString(),
      icon: Briefcase,
      desc: "Currently published positions",
      color: "text-[var(--color-brand)]",
      bg: "bg-[var(--color-brand-light)]",
      border: "border-[var(--color-brand-muted)]/40",
    },
    {
      label: "Candidates In Pipeline",
      value: inPipeline.total.toLocaleString(),
      icon: GitPullRequest,
      desc: `${inPipeline.screening} screening · ${inPipeline.interview} interview · ${inPipeline.shortlisted} shortlisted`,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
    {
      label: "Hired Candidates",
      value: hired.toLocaleString(),
      icon: UserCheck,
      desc: "Successfully made offers",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Rejected Candidates",
      value: rejected.toLocaleString(),
      icon: UserX,
      desc: "Did not progress further",
      color: "text-red-500",
      bg: "bg-red-50",
      border: "border-red-100",
    },
    {
      label: "Avg AI Score",
      value: avgAiScore > 0 ? `${avgAiScore}/100` : "—",
      icon: Brain,
      desc: "Average CV analysis score",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className={`border ${card.border} hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${card.bg}`}>
                  <Icon size={17} className={card.color} strokeWidth={1.75} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[var(--color-foreground)] tabular-nums tracking-tight">
                {card.value}
              </p>
              <p className="text-xs font-semibold text-[var(--color-foreground)] mt-2 leading-snug">{card.label}</p>
              <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1 leading-snug">
                {card.desc}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
