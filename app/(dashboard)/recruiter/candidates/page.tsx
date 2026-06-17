import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Users, Mail, FileText, Calendar } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Candidates" };

export default async function RecruiterCandidatesPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  if (!role) redirect("/login");
  if (!["recruiter", "admin"].includes(role)) redirect("/candidate");

  const supabase = createAdminClient();

  // 1. Fetch all candidate user profiles
  const { data: candidates = [] } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, created_at")
    .eq("role", "candidate")
    .order("created_at", { ascending: false });

  // 2. Fetch application counts per candidate
  const { data: appCounts = [] } = await supabase
    .from("applications")
    .select("candidate_id");

  const applicationCountMap: Record<string, number> = {};
  appCounts?.forEach((app: any) => {
    applicationCountMap[app.candidate_id] = (applicationCountMap[app.candidate_id] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Candidates Directory</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          {candidates?.length || 0} candidate profiles registered
        </p>
      </div>

      {/* Directory Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users size={18} className="text-[var(--color-brand)]" />
            Candidate List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!candidates || candidates.length === 0 ? (
            <div className="py-16 text-center text-[var(--color-muted-foreground)] space-y-2">
              <Users size={32} className="mx-auto text-[var(--color-muted-foreground)]/30 mb-2" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[var(--color-foreground)]">No candidates found</p>
              <p className="text-xs">Candidate profiles will show up here once they register or apply.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full text-left">
                <thead className="bg-[var(--color-muted)]/50 text-xs font-semibold text-[var(--color-muted-foreground)] uppercase">
                  <tr>
                    <th className="px-5 py-3">Candidate Name</th>
                    <th className="px-5 py-3">Email Address</th>
                    <th className="px-5 py-3">Registered Date</th>
                    <th className="px-5 py-3">Applications</th>
                    <th className="px-5 py-3 sr-only">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {candidates.map((candidate: any) => {
                    const appCount = applicationCountMap[candidate.id] || 0;
                    return (
                      <tr
                        key={candidate.id}
                        className="hover:bg-[var(--color-muted)]/10 transition-colors group"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/recruiter/candidates/${candidate.id}`}
                            className="font-semibold text-sm text-[var(--color-foreground)] group-hover:text-[var(--color-brand)] transition-colors"
                          >
                            {candidate.full_name || "Unnamed Candidate"}
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-sm text-[var(--color-muted-foreground)]">
                          <span className="flex items-center gap-1.5">
                            <Mail size={13} />
                            {candidate.email}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-[var(--color-muted-foreground)]">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={12} />
                            {formatDate(candidate.created_at)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded bg-[var(--color-muted)] font-medium text-[var(--color-foreground)]">
                            <FileText size={11} /> {appCount} {appCount === 1 ? "application" : "applications"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/recruiter/candidates/${candidate.id}`}
                            className="text-xs font-semibold text-[var(--color-brand)] hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            View Profile →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
