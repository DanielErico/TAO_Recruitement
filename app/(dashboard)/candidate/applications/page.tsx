import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatDate, getStatusConfig } from "@/lib/utils";
import { FileText, Clock, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Applications" };

export default async function CandidateApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role;
  const userId = user.id;

  if (!role || !userId) redirect("/login");
  if (role !== "candidate") redirect("/recruiter");

  const { data: rawApplications } = await supabase
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
    .order("applied_at", { ascending: false });

  const applications = rawApplications ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">My Applications</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            Track the status of your job applications.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/jobs">Browse Jobs</Link>
        </Button>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-white py-16 text-center shadow-sm">
          <FileText
            size={32}
            className="mx-auto text-[var(--color-muted-foreground)] mb-3"
            strokeWidth={1.5}
          />
          <p className="text-sm font-medium text-[var(--color-foreground)]">No applications yet</p>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            You haven&apos;t applied to any positions.
          </p>
          <div className="mt-4">
            <Button asChild size="sm">
              <Link href="/jobs">Browse Open Roles</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((app: any) => {
            const statusCfg = getStatusConfig(app.status);
            return (
              <div
                key={app.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-lg border border-[var(--color-border)] bg-white shadow-sm"
              >
                <div className="space-y-1.5">
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                    {app.job.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
                    <span>{app.job.department?.name ?? "Other"}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> Applied {formatDate(app.applied_at)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 sm:mt-0 flex flex-col sm:items-end gap-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                    {statusCfg.label}
                  </span>
                  
                  {app.status === "interview" && (
                    <Button size="sm" asChild>
                      <Link href={`/candidate/interview/${app.id}`}>
                        Start Interview
                      </Link>
                    </Button>
                  )}
                  {app.status !== "interview" && (
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
    </div>
  );
}
