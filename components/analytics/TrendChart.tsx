"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  initialTrend: { date: string; count: number }[];
}

const RANGES = ["7d", "30d", "90d", "1y"] as const;
type Range = (typeof RANGES)[number];

const RANGE_LABELS: Record<Range, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
  "1y": "1 Year",
};

function computeGrowth(trend: { date: string; count: number }[]) {
  const mid = Math.floor(trend.length / 2);
  const first = trend.slice(0, mid).reduce((s, r) => s + r.count, 0);
  const second = trend.slice(mid).reduce((s, r) => s + r.count, 0);
  if (first === 0) return second > 0 ? 100 : 0;
  return Math.round(((second - first) / first) * 100);
}

function formatDateLabel(dateStr: string, range: Range) {
  try {
    const d = parseISO(dateStr);
    if (range === "1y") return format(d, "MMM yyyy");
    if (range === "90d") return format(d, "MMM d");
    return format(d, "MMM d");
  } catch {
    return dateStr;
  }
}

export function TrendChart({ initialTrend }: Props) {
  const [range, setRange] = useState<Range>("30d");
  const [trend, setTrend] = useState(initialTrend);
  const [loading, setLoading] = useState(false);

  // Sync state with prop updates during render phase
  const [prevInitialTrend, setPrevInitialTrend] = useState(initialTrend);
  if (initialTrend !== prevInitialTrend) {
    setPrevInitialTrend(initialTrend);
    setTrend(initialTrend);
  }

  // Adjust trend state when range changes to "30d" during render phase
  const [prevRange, setPrevRange] = useState<Range>("30d");
  if (range !== prevRange) {
    setPrevRange(range);
    if (range === "30d") {
      setTrend(initialTrend);
    }
  }

  const growth = computeGrowth(trend);
  const totalInRange = trend.reduce((s, r) => s + r.count, 0);

  useEffect(() => {
    if (range === "30d") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/analytics/trend?range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        setTrend(d.trend || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  // For 1y, aggregate by week to reduce noise
  const chartData =
    range === "1y"
      ? trend
          .reduce(
            (acc: { date: string; count: number }[], curr, i) => {
              if (i % 7 === 0) acc.push({ date: curr.date, count: curr.count });
              else acc[acc.length - 1].count += curr.count;
              return acc;
            },
            []
          )
      : trend;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base font-semibold">Application Trend</CardTitle>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Applications received over time
            </p>
          </div>
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "outline"}
                onClick={() => setRange(r)}
                className={`text-xs h-7 px-2.5 ${range === r ? "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]" : ""}`}
              >
                {RANGE_LABELS[r]}
              </Button>
            ))}
          </div>
        </div>
        {/* Summary stats */}
        <div className="flex items-center gap-4 pt-1">
          <div>
            <p className="text-2xl font-bold text-[var(--color-foreground)] tabular-nums">
              {totalInRange.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">applications this period</p>
          </div>
          <div className="flex items-center gap-1">
            {growth > 0 ? (
              <TrendingUp size={16} className="text-emerald-500" />
            ) : growth < 0 ? (
              <TrendingDown size={16} className="text-red-500" />
            ) : (
              <Minus size={16} className="text-[var(--color-muted-foreground)]" />
            )}
            <span
              className={`text-sm font-semibold ${
                growth > 0 ? "text-emerald-600" : growth < 0 ? "text-red-500" : "text-[var(--color-muted-foreground)]"
              }`}
            >
              {growth > 0 ? "+" : ""}
              {growth}%
            </span>
            <span className="text-xs text-[var(--color-muted-foreground)]">vs prior period</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`h-52 transition-opacity ${loading ? "opacity-40" : "opacity-100"}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#046C44" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#046C44" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => formatDateLabel(d, range)}
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval={
                  range === "7d" ? 0 : range === "30d" ? 4 : range === "90d" ? 13 : "preserveStartEnd"
                }
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                labelFormatter={(d) => format(parseISO(d), "MMMM d, yyyy")}
                formatter={(value) => [value ?? 0, "Applications"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#046C44"
                strokeWidth={2}
                fill="url(#trendGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#046C44" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
