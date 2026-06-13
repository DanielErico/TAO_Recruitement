import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, FileText, MessageSquare, Star, Clock, ExternalLink } from "lucide-react";
import { formatDate, getStatusConfig } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Candidate Dashboard" };

/** Wrap a promise with a timeout; resolves to null if the DB is unreachable */
function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((res) => setTimeout(() => res(null), ms)),
  ]);
}

export default async function CandidateDashboardPage() {
  const cookieStore = await cookies();

  const role = cookieStore.get("user_role")?.value;
  const fullName = cookieStore.get("mock_user_name")?.value || "Candidate";
  const userId = cookieStore.get("mock_user_id")?.value;

  if (!role || !userId) redirect("/login");
  if (role !== "candidate") redirect("/recruiter");

  const supabase = createAdminClient();

  // Run all DB queries in parallel with 8s timeout each
  const [
    appCountResult,
    openJobsResult,
    completedInterviewsResult,
    evalsResult,
    recentAppsResult,
  ] = await Promise.all([
    withTimeout(Promise.resolve(supabase.from("applications").select("id", { count: "exact", head: true }).eq("candidate_id", userId))),
    withTimeout(Promise.resolve(supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "published"))),
    withTimeout(Promise.resolve(supabase.from("interviews").select("id", { count: "exact", head: true }).eq("candidate_id", userId).eq("status", "completed"))),
    withTimeout(Promise.resolve(supabase.from("evaluations").select("overall_score").eq("candidate_id", userId))),
    withTimeout(Promise.resolve(supabase.from("applications").select(`
      id,
      status,
      applied_at,
      job:jobs (
        id,
        title,
        location,
        remote,
        department:departments (name)
      )
    `).eq("candidate_id", userId).order("applied_at", { ascending: false }).limit(3))),
  ]);

  const appCount = (appCountResult as any)?.count ?? 0;
  const openJobsCount = (openJobsResult as any)?.count ?? 0;
  const completedInterviewsCount = (completedInterviewsResult as any)?.count ?? 0;
  const evals = (evalsResult as any)?.data || [];
  const recentApps = (recentAppsResult as any)?.data || [];

  const avgMatchScore =
    evals.length > 0
      ? Math.round(evals.reduce((acc: number, curr: any) => acc + curr.overall_score, 0) / evals.length) + "%"
      : "—";


  const stats = [
    { label: "Applications Sent", value: appCount ?? 0, icon: FileText },
    { label: "Open Jobs Available", value: openJobsCount ?? 0, icon: Briefcase },
    { label: "Interviews Completed", value: completedInterviewsCount ?? 0, icon: MessageSquare },
    { label: "Average Match Score", value: avgMatchScore, icon: Star },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Welcome back, {fullName.split(" ")[0]}</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          Track your applications and interviews below.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">
                    {stat.label}
                  </CardTitle>
                  <div className="p-1.5 rounded-md bg-[var(--color-brand-light)]">
                    <Icon size={15} className="text-[var(--color-brand)]" strokeWidth={1.75} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[var(--color-foreground)]">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Applications */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold">Recent Applications</CardTitle>
          {recentApps.length > 0 && (
            <Button asChild size="sm" variant="ghost" className="text-xs h-8">
              <Link href="/candidate/applications">View All</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {recentApps.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Briefcase size={32} className="text-[var(--color-muted-foreground)] mx-auto opacity-30" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[var(--color-foreground)]">No applications yet</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Browse available jobs and submit your first application.
              </p>
              <div className="pt-2">
                <Button asChild size="sm">
                  <Link href="/candidate/jobs">Browse Open Roles</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {recentApps.map((app: any) => {
                const statusCfg = getStatusConfig(app.status);
                return (
                  <div
                    key={app.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-4 first:pt-0 last:pb-0 gap-3"
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-[var(--color-foreground)]">
                        {app.job.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--color-muted-foreground)]">
                        <span>{app.job.department?.name ?? "Other"}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-0.5">
                          <Clock size={12} /> Applied {formatDate(app.applied_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                      {app.status === "interview" ? (
                        <Button size="sm" asChild className="h-8">
                          <Link href={`/candidate/interview/${app.id}`}>Start Interview</Link>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" asChild className="h-8">
                          <Link href={`/jobs/${app.job.id}`} target="_blank">
                            View Role <ExternalLink size={12} className="ml-1" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
