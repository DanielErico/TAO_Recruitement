import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, Calendar, ChevronRight, CheckCircle2, Clock, WifiOff, Briefcase } from "lucide-react";
import { formatDate, getStatusConfig } from "@/lib/utils";
import { isServerPlanA } from "@/lib/config-server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Assessments" };

function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export default async function CandidateAssessmentsPage() {
  // If Plan A is active, redirect to interviews
  if (await isServerPlanA()) {
    redirect("/candidate/interviews");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role;
  const userId = user.id;

  if (!role || !userId) redirect("/login");
  if (role !== "candidate") redirect("/recruiter");

  const result = await withTimeout(
    Promise.resolve(
      supabase
        .from("applications")
        .select(`
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
        `)
        .eq("candidate_id", userId)
        .order("applied_at", { ascending: false })
    )
  );

  const dbUnavailable = result === null;
  const applications = (result as any)?.data || [];

  const activeAssessments = applications.filter((app: any) => app.status === "interview");
  const pastAssessments = applications.filter((app: any) =>
    ["evaluation", "shortlisted", "offered", "rejected"].includes(app.status)
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title">My Online Assessments</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          Access your role-specific recruitment assessments and track evaluation progress.
        </p>
      </div>

      {dbUnavailable && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <WifiOff size={16} className="shrink-0" />
          <span>Database is temporarily unreachable. Assessment data could not be loaded.</span>
        </div>
      )}

      {/* Active Assessments */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)] flex items-center gap-2">
          <Clock size={18} className="text-[var(--color-brand)]" />
          Active Assessments to Complete
        </h2>

        {activeAssessments.length === 0 ? (
          <Card className="py-12 text-center border-dashed border-2">
            <CardContent className="space-y-3">
              <FileCheck size={32} className="mx-auto text-[var(--color-muted-foreground)] opacity-25" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[var(--color-foreground)]">No pending assessments</p>
              <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm mx-auto">
                Once your application and CV are processed for an applied position, your role assessment will appear here.
              </p>
              {!dbUnavailable && (
                <div className="pt-2">
                  <Button asChild size="sm">
                    <Link href="/candidate/jobs">Browse Open Roles</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activeAssessments.map((app: any) => (
              <Card key={app.id} className="border-l-4 border-l-[var(--color-brand)] shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Ready to Start
                      </span>
                      <span className="text-xs text-[var(--color-muted-foreground)]">~20 minutes</span>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--color-foreground)]">{app.job.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
                      <span>{app.job.department?.name ?? "General"}</span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} /> Applied {formatDate(app.applied_at)}
                      </span>
                    </div>
                  </div>

                  <Button asChild className="shrink-0 shadow-sm font-semibold">
                    <Link href={`/candidate/assessment/${app.id}`}>
                      Start Online Assessment <ChevronRight size={16} className="ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Past / Completed Assessments */}
      {pastAssessments.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            Submitted Assessments
          </h2>

          <div className="grid gap-3">
            {pastAssessments.map((app: any) => {
              const statusCfg = getStatusConfig(app.status);
              return (
                <div
                  key={app.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-[var(--color-border)] bg-white gap-3 shadow-xs"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-[var(--color-foreground)]">{app.job.title}</h4>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {app.job.department?.name ?? "Other"} &bull; Submitted {formatDate(app.applied_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                      {statusCfg.label}
                    </span>
                    <Button variant="ghost" size="sm" asChild className="text-xs h-8">
                      <Link href="/candidate/applications">View Status</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

