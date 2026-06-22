"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Code2 } from "lucide-react";

interface Props {
  topSkills: { skill: string; count: number; percentage: number }[];
}

const SKILL_COLORS = [
  "#046C44", "#059669", "#10b981", "#34d399",
  "#6ee7b7", "#0284c7", "#0ea5e9", "#38bdf8",
  "#7c3aed", "#8b5cf6", "#a78bfa", "#d97706",
  "#f59e0b", "#fbbf24", "#ef4444",
];

export function SkillsChart({ topSkills }: Props) {
  if (!topSkills || topSkills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Code2 size={16} className="text-[var(--color-brand)]" />
            Top Skills
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-[var(--color-muted-foreground)]">No skill data yet.</p>
        </CardContent>
      </Card>
    );
  }

  const top10 = topSkills.slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-[var(--color-brand)]" />
          <CardTitle className="text-base font-semibold">Top Skills in Applicant Pool</CardTitle>
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Most common skills extracted from AI CV analysis
        </p>
      </CardHeader>
      <CardContent>
        {/* Bar chart */}
        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={top10}
              layout="vertical"
              margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="skill"
                tick={{ fontSize: 11, fill: "var(--color-foreground)", fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value, _n, props: { payload?: { percentage?: number } }) => [
                  `${value ?? 0} candidates (${props?.payload?.percentage ?? 0}%)`,
                  "Frequency",
                ]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {top10.map((_entry, index) => (
                  <Cell key={index} fill={SKILL_COLORS[index % SKILL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Skill Cloud */}
        <div>
          <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-2">
            Skill Cloud
          </p>
          <div className="flex flex-wrap gap-2">
            {topSkills.map((s, i) => {
              const size = i < 3 ? "text-sm font-bold" : i < 7 ? "text-xs font-semibold" : "text-[11px] font-medium";
              return (
                <span
                  key={s.skill}
                  className={`inline-flex items-center px-2.5 py-1 rounded-full border border-[var(--color-border)] ${size}`}
                  style={{
                    backgroundColor: `${SKILL_COLORS[i % SKILL_COLORS.length]}15`,
                    color: SKILL_COLORS[i % SKILL_COLORS.length],
                    borderColor: `${SKILL_COLORS[i % SKILL_COLORS.length]}40`,
                  }}
                >
                  {s.skill}
                  <span className="ml-1.5 text-[10px] opacity-70">{s.percentage}%</span>
                </span>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
