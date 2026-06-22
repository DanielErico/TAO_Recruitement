"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter } from "lucide-react";

interface FunnelStage {
  stage: string;
  count: number;
  conversion: number;
  dropOff: number;
}

interface Props {
  funnel: FunnelStage[];
}

const STAGE_COLORS = [
  { bg: "bg-blue-500", light: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { bg: "bg-violet-500", light: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  { bg: "bg-purple-500", light: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  { bg: "bg-amber-500", light: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { bg: "bg-orange-500", light: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  { bg: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
];

export function FunnelChart({ funnel }: Props) {
  const maxCount = funnel[0]?.count || 1;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[var(--color-brand)]" />
          <CardTitle className="text-base font-semibold">Recruitment Funnel</CardTitle>
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Pipeline progression and conversion at each stage
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-2 pb-4">
        {funnel.map((stage, i) => {
          const color = STAGE_COLORS[i] || STAGE_COLORS[0];
          const widthPct = maxCount === 0 ? 0 : Math.round((stage.count / maxCount) * 100);

          return (
            <div key={stage.stage}>
              <div className={`relative rounded-xl border ${color.border} ${color.light} p-4 overflow-hidden`}>
                {/* Progress fill */}
                <div
                  className={`absolute inset-y-0 left-0 ${color.bg} opacity-15 rounded-lg transition-all duration-700`}
                  style={{ width: `${widthPct}%` }}
                />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${color.bg} shrink-0`} />
                    <span className={`text-sm font-semibold ${color.text}`}>{stage.stage}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-sm font-bold text-[var(--color-foreground)] tabular-nums">
                        {stage.count.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[var(--color-muted-foreground)]">candidates</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-foreground)] tabular-nums">
                        {stage.conversion}%
                      </p>
                      <p className="text-[10px] text-[var(--color-muted-foreground)]">of total</p>
                    </div>
                    {i > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-red-500 tabular-nums">
                          -{stage.dropOff}%
                        </p>
                        <p className="text-[10px] text-[var(--color-muted-foreground)]">drop-off</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {i < funnel.length - 1 && (
                  <div className="flex justify-center my-1">
                    <div className="w-0.5 h-4 bg-[var(--color-border)]" />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
