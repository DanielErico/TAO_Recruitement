"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Star } from "lucide-react";

interface Props {
  qualityDist: { Excellent: number; Good: number; Average: number; Weak: number };
  totalAnalyzed: number;
}

const QUALITY_CONFIG = [
  { key: "Excellent" as const, color: "#059669", bg: "bg-emerald-50", text: "text-emerald-700", desc: "AI ≥75 · High exp · Many skills" },
  { key: "Good" as const, color: "#0284c7", bg: "bg-blue-50", text: "text-blue-700", desc: "AI ≥55 · Good experience" },
  { key: "Average" as const, color: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700", desc: "AI ≥35 · Some experience" },
  { key: "Weak" as const, color: "#ef4444", bg: "bg-red-50", text: "text-red-700", desc: "Below threshold" },
];

export function QualityIndex({ qualityDist, totalAnalyzed }: Props) {
  if (totalAnalyzed === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Star size={16} className="text-amber-500" />
            TAO Quality Index
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-[var(--color-muted-foreground)]">No AI analyses yet.</p>
        </CardContent>
      </Card>
    );
  }

  const pieData = QUALITY_CONFIG.map((q) => ({
    name: q.key,
    value: qualityDist[q.key],
    fill: q.color,
  })).filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-amber-500" />
          <CardTitle className="text-base font-semibold">TAO Candidate Quality Index</CardTitle>
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Composite score: 40% AI · 30% Experience · 20% Skills · 10% Education
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 items-center">
          {/* Pie */}
          <div className="h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value, n) => [
                    `${value ?? 0} (${totalAnalyzed > 0 ? Math.round(((value as number ?? 0) / totalAnalyzed) * 100) : 0}%)`,
                    String(n),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend + breakdown */}
          <div className="flex-1 space-y-2">
            {QUALITY_CONFIG.map((q) => {
              const count = qualityDist[q.key];
              const pct = totalAnalyzed > 0 ? Math.round((count / totalAnalyzed) * 100) : 0;
              return (
                <div key={q.key} className={`p-2.5 rounded-lg ${q.bg} border border-transparent`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: q.color }} />
                      <span className={`text-sm font-bold ${q.text}`}>{q.key}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold tabular-nums ${q.text}`}>{count}</span>
                      <span className="text-[11px] text-[var(--color-muted-foreground)] ml-1">({pct}%)</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5 ml-4.5">{q.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
