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
import { Brain, TrendingUp, TrendingDown, Target } from "lucide-react";

interface Props {
  aiInsights: {
    avgScore: number;
    maxScore: number;
    minScore: number;
    distribution: { range: string; count: number; percentage: number }[];
    totalAnalyzed: number;
  };
}

const DIST_COLORS = ["#059669", "#10b981", "#f59e0b", "#f97316", "#ef4444"];

function ScoreGauge({ score }: { score: number }) {
  const pct = score;
  const color = score >= 80 ? "#059669" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: `conic-gradient(${color} ${pct * 3.6}deg, #E2E8E5 ${pct * 3.6}deg)`,
        }}
      >
        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
          <span className="text-lg font-bold tabular-nums" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1.5 font-medium">Avg Score</p>
    </div>
  );
}

export function AIInsightsPanel({ aiInsights }: Props) {
  const { avgScore, maxScore, minScore, distribution, totalAnalyzed } = aiInsights;

  if (totalAnalyzed === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Brain size={16} className="text-[var(--color-brand)]" />
            AI Screening Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No AI analyses have been completed yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-[var(--color-brand)]" />
          <CardTitle className="text-base font-semibold">AI Screening Insights</CardTitle>
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {totalAnalyzed.toLocaleString()} CVs analyzed by AI
        </p>
      </CardHeader>
      <CardContent>
        {/* Score summary */}
        <div className="flex items-center justify-around mb-6 pb-5 border-b border-[var(--color-border)]">
          <ScoreGauge score={avgScore} />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-500" />
              <div>
                <p className="text-[11px] text-[var(--color-muted-foreground)] font-medium">Highest</p>
                <p className="text-xl font-bold text-emerald-600 tabular-nums">{maxScore}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown size={14} className="text-red-500" />
              <div>
                <p className="text-[11px] text-[var(--color-muted-foreground)] font-medium">Lowest</p>
                <p className="text-xl font-bold text-red-500 tabular-nums">{minScore}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Target size={14} className="text-[var(--color-muted-foreground)]" />
            <div>
              <p className="text-[11px] text-[var(--color-muted-foreground)] font-medium">Range</p>
              <p className="text-sm font-bold text-[var(--color-foreground)] tabular-nums">
                {minScore}–{maxScore}
              </p>
            </div>
          </div>
        </div>

        {/* Distribution chart */}
        <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-3">
          Score Distribution
        </p>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
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
                  "Count",
                ]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {distribution.map((_entry, index) => (
                  <Cell key={index} fill={DIST_COLORS[index] || "#046C44"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-1 mt-2">
          {distribution.map((d, i) => (
            <div key={d.range} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: DIST_COLORS[i] }} />
              <span className="text-[11px] text-[var(--color-muted-foreground)]">
                {d.range}: <strong className="text-[var(--color-foreground)]">{d.percentage}%</strong>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
