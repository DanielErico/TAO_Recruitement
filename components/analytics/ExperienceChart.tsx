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
import { Clock } from "lucide-react";

interface Props {
  experience: { label: string; count: number }[];
}

const COLORS = ["#e0f2fe", "#bae6fd", "#7dd3fc", "#38bdf8", "#0284c7"];

export function ExperienceChart({ experience }: Props) {
  const maxCount = Math.max(...experience.map((e) => e.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[var(--color-brand)]" />
          <CardTitle className="text-base font-semibold">Experience Distribution</CardTitle>
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Years of experience breakdown across applicants
        </p>
      </CardHeader>
      <CardContent>
        {/* Bar chart */}
        <div className="h-44 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={experience} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
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
                formatter={(value) => [value ?? 0, "Candidates"]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {experience.map((_entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Experience breakdown */}
        <div className="space-y-2">
          {experience.map((e, i) => {
            const pct = Math.round((e.count / maxCount) * 100);
            return (
              <div key={e.label} className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-medium text-[var(--color-foreground)]">{e.label}</span>
                    <span className="text-xs font-semibold text-[var(--color-foreground)] tabular-nums">
                      {e.count}
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-[var(--color-muted)]">
                    <div
                      className="h-1 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                    />
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
