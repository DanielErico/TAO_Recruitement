"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type Job = {
  id: string;
  title: string;
  department: string;
  applicants: number;
  qualified: number;
  interviewed: number;
  hired: number;
  avgAiScore: number;
};

interface Props {
  jobs: Job[];
}

type SortKey = keyof Pick<Job, "applicants" | "qualified" | "interviewed" | "hired" | "avgAiScore">;

export function JobPerformanceTable({ jobs }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("applicants");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = [...jobs].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDir === "asc" ? diff : -diff;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown size={12} className="opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp size={12} className="text-[var(--color-brand)]" />
      : <ChevronDown size={12} className="text-[var(--color-brand)]" />;
  }

  const scoreColor = (s: number) =>
    s >= 80 ? "text-emerald-600 bg-emerald-50" :
    s >= 60 ? "text-amber-600 bg-amber-50" :
    s > 0 ? "text-red-500 bg-red-50" : "text-[var(--color-muted-foreground)] bg-[var(--color-muted)]";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Job Performance Analytics</CardTitle>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Click column headers to sort. Shows all jobs and their recruitment performance.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead className="bg-[var(--color-muted)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left">Job Title</th>
                <th className="text-left">Department</th>
                {(["applicants", "qualified", "interviewed", "hired", "avgAiScore"] as SortKey[]).map((col) => (
                  <th
                    key={col}
                    className="cursor-pointer select-none hover:text-[var(--color-brand)] transition-colors"
                    onClick={() => handleSort(col)}
                  >
                    <div className="flex items-center gap-1">
                      {col === "avgAiScore" ? "Avg AI Score" : col.charAt(0).toUpperCase() + col.slice(1)}
                      <SortIcon col={col} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[var(--color-muted-foreground)] text-sm">
                    No jobs found.
                  </td>
                </tr>
              ) : (
                sorted.map((job) => (
                  <tr key={job.id}>
                    <td className="font-medium text-[var(--color-foreground)] max-w-[220px]">
                      <p className="truncate">{job.title}</p>
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                        {job.department}
                      </span>
                    </td>
                    <td className="tabular-nums font-semibold">{job.applicants}</td>
                    <td className="tabular-nums">{job.qualified}</td>
                    <td className="tabular-nums">{job.interviewed}</td>
                    <td className="tabular-nums">
                      <span className={`font-semibold ${job.hired > 0 ? "text-emerald-600" : "text-[var(--color-muted-foreground)]"}`}>
                        {job.hired}
                      </span>
                    </td>
                    <td>
                      {job.avgAiScore > 0 ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${scoreColor(job.avgAiScore)}`}>
                          {job.avgAiScore}
                        </span>
                      ) : (
                        <span className="text-[var(--color-muted-foreground)] text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
