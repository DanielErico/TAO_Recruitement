import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Calendar, ChevronRight, CheckCircle2, Clock, WifiOff } from "lucide-react";
import { formatDate, getStatusConfig } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Interviews" };

/** Wrap any promise with a timeout — resolves to null if DB is unreachable */
function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export default async function CandidateInterviewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role;
  const userId = user.id;

  if (!role || !userId) redirect("/login");
  if (role !== "candidate") redirect("/recruiter");

  // Fetch applications with a 8-second timeout to avoid 90s hangs
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

  const activeInterviews = applications.filter((app: any) => app.status === "interview");
  const pastInterviews = applications.filter((app: any) =>
    ["evaluation", "shortlisted", "offered", "rejected"].includes(app.status)
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title">My Interviews</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          Access your automated AI screening interviews and track outcomes.
        </p>
      </div>

      {/* DB Unavailable Banner */}
      {dbUnavailable && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <WifiOff size={16} className="shrink-0" />
          <span>
            Database is temporarily unreachable on this network. Interview data could not be loaded.
            Try again on a different network.
          </span>
        </div>
      )}

      {/* Active Interviews */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)] flex items-center gap-2">
          <Clock size={18} className="text-[var(--color-brand)]" />
          Active Invites
        </h2>

        {activeInterviews.length === 0 ? (
          <Card className="py-12 text-center border-dashed border-2">
            <CardContent className="space-y-3">
              <MessageSquare size={32} className="mx-auto text-[var(--color-muted-foreground)] opacity-20" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[var(--color-foreground)]">No active interview invites</p>
              <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm mx-auto">
                {dbUnavailable
                  ? "Could not load data — database is unreachable on this network."
                  : "Once a recruiter invites you to complete our automated AI screening, it will appear here."}
              </p>
              {!dbUnavailable && (
                <div className="pt-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/candidate/jobs">Browse Open Roles</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activeInterviews.map((app: any) => (
              <Card key={app.id} className="border-[var(--color-brand)]/20 bg-[var(--color-brand-light)]/10">
                <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-[var(--color-foreground)]">
                      {app.job.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-muted-foreground)]">
                      <span>{app.job.department?.name ?? "Other"}</span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} /> Invited {formatDate(app.applied_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-brand)] font-medium">
                      Requires ~15 minutes. Text-based automated interview with TAO AI.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Button asChild className="w-full sm:w-auto shadow-sm">
                      <Link href={`/candidate/interview/${app.id}`}>
                        Start AI Interview <ChevronRight size={16} className="ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Completed/Past Interviews */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)] flex items-center gap-2">
          <CheckCircle2 size={18} className="text-[var(--color-brand)]" />
          Completed &amp; Under Review
        </h2>

        {pastInterviews.length === 0 ? (
          <div className="text-sm text-[var(--color-muted-foreground)] italic py-2">
            No completed interviews yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {pastInterviews.map((app: any) => {
              const statusCfg = getStatusConfig(app.status);
              return (
                <Card key={app.id}>
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-[var(--color-foreground)]">
                        {app.job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
                        <span>{app.job.department?.name ?? "Other"}</span>
                        <span>&bull;</span>
                        <span>Completed {formatDate(app.applied_at)}</span>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
