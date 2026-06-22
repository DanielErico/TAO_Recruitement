"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { GraduationCap } from "lucide-react";

interface Props {
  education: {
    degrees: { degree: string; count: number; percentage: number }[];
    levels: { level: string; count: number; percentage: number }[];
  };
}

const COLORS = ["#046C44", "#059669", "#10b981", "#34d399", "#6ee7b7", "#0284c7", "#0ea5e9", "#7c3aed"];

export function EducationChart({ education }: Props) {
  const { degrees, levels } = education;

  if (levels.length === 0 && degrees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <GraduationCap size={16} className="text-[var(--color-brand)]" />
            Education Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-[var(--color-muted-foreground)]">No education data yet.</p>
        </CardContent>
      </Card>
    );
  }

  const pieData = levels.map((l, i) => ({
    name: l.level,
    value: l.count,
    percentage: l.percentage,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-[var(--color-brand)]" />
          <CardTitle className="text-base font-semibold">Education Insights</CardTitle>
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Highest qualification levels and degree distribution
        </p>
      </CardHeader>
      <CardContent>
        {/* Education Level Pie */}
        <div className="h-44 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value, _n, props: { payload?: { percentage?: number; name?: string } }) => [
                  `${value ?? 0} (${props?.payload?.percentage}%)`,
                  props?.payload?.name,
                ]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ fontSize: "11px", color: "var(--color-foreground)" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Common Degrees */}
        {degrees.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-2">
              Most Common Degrees
            </p>
            <div className="space-y-1.5">
              {degrees.slice(0, 5).map((d) => (
                <div key={d.degree} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-[var(--color-foreground)] truncate">{d.degree}</span>
                      <span className="text-[11px] text-[var(--color-muted-foreground)] shrink-0 ml-2">{d.count}</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-[var(--color-muted)]">
                      <div
                        className="h-1 rounded-full bg-[var(--color-brand)]"
                        style={{ width: `${d.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
