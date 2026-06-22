"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";

interface Recruiter {
  id: string;
  name: string;
  email: string;
  jobsPosted: number;
  applicationsReviewed: number;
  interviewed: number;
  hired: number;
}

interface Props {
  recruiters: Recruiter[];
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 0) return <Trophy size={16} className="text-amber-500" />;
  if (rank === 1) return <Medal size={16} className="text-slate-400" />;
  if (rank === 2) return <Award size={16} className="text-amber-700" />;
  return (
    <span className="w-4 h-4 flex items-center justify-center text-[11px] font-bold text-[var(--color-muted-foreground)]">
      {rank + 1}
    </span>
  );
}

export function RecruiterLeaderboard({ recruiters }: Props) {
  if (recruiters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            Recruiter Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-[var(--color-muted-foreground)]">No recruiter data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <CardTitle className="text-base font-semibold">Recruiter Leaderboard</CardTitle>
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Ranked by total applications reviewed
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead className="bg-[var(--color-muted)] border-b border-[var(--color-border)]">
            <tr>
              <th className="text-left py-2 px-4 text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                #
              </th>
              <th className="text-left py-2 px-4 text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                Recruiter
              </th>
              <th className="text-right py-2 px-4 text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                Jobs
              </th>
              <th className="text-right py-2 px-4 text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                Reviewed
              </th>
              <th className="text-right py-2 px-4 text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                Hired
              </th>
            </tr>
          </thead>
          <tbody>
            {recruiters.map((r, i) => (
              <tr
                key={r.id}
                className={`border-b border-[var(--color-border)] last:border-0 transition-colors hover:bg-[var(--color-muted)]/50 ${
                  i === 0 ? "bg-amber-50/50" : ""
                }`}
              >
                <td className="py-3 px-4">
                  <RankIcon rank={i} />
                </td>
                <td className="py-3 px-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-foreground)] truncate max-w-[120px]">
                      {r.name}
                    </p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)] truncate max-w-[120px]">
                      {r.email}
                    </p>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm tabular-nums font-medium">{r.jobsPosted}</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm tabular-nums font-semibold text-[var(--color-foreground)]">
                    {r.applicationsReviewed}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`text-sm tabular-nums font-bold ${
                      r.hired > 0 ? "text-emerald-600" : "text-[var(--color-muted-foreground)]"
                    }`}
                  >
                    {r.hired}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
