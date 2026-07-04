import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, getStatusConfig } from "@/lib/utils";
import { ArrowLeft, Edit, MapPin, Users, Briefcase, FileText, Calendar } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  return { title: job ? `${job.title} — Details` : "Job Details" };
}

export default async function RecruiterJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = await params;

  // Authenticate via real Supabase session
  const supabaseSession = await createClient();
  const { data: { user } } = await supabaseSession.auth.getUser();
  if (!user) redirect("/login");

  const role = user.user_metadata?.role;
  if (!role) redirect("/login");
  if (!["recruiter", "admin"].includes(role)) redirect("/candidate");

  // Use admin client to bypass RLS (consistent with how API routes work)
  const supabase = createAdminClient();

  // 1. Fetch job with department name
  const { data: job } = await supabase
    .from("jobs")
    .select(`
      *,
      department:departments(name)
    `)
    .eq("id", jobId)
    .maybeSingle();

  if (!job) {
    notFound();
  }

  // 2. Fetch applications for this job, joining candidates and CV analyses
  const { data: applications = [] } = await supabase
    .from("applications")
    .select(`
      id,
      status,
      applied_at,
      candidate:user_profiles (
        id,
        full_name,
        email
      ),
      cv_analysis:cv_analyses (
        job_fit_score
      )
    `)
    .eq("job_id", jobId)
    .order("applied_at", { ascending: false });

  const employmentTypeLabels: Record<string, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    contract: "Contract",
    internship: "Internship",
  };

  const experienceLevelLabels: Record<string, string> = {
    entry: "Entry Level",
    mid: "Mid Level",
    senior: "Senior Level",
    lead: "Lead / Manager",
    executive: "Executive",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumbs / Header */}
      <div>
        <Link
          href="/recruiter/jobs"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors mb-4"
        >
          <ArrowLeft size={16} /> Back to Jobs
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-foreground)] tracking-tight">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-sm text-[var(--color-muted-foreground)]">
              <span>{job.department?.name || "Other"}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {job.location || "Remote"} {job.remote ? "(Remote)" : ""}
              </span>
              <span>&bull;</span>
              <span>{employmentTypeLabels[job.employment_type] || job.employment_type}</span>
              <span>&bull;</span>
              <span>{experienceLevelLabels[job.experience_level] || job.experience_level}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            <Button asChild variant="outline">
              <Link href={`/recruiter/jobs/${job.id}/edit`}>
                <Edit size={14} className="mr-1.5" /> Edit Job
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applicants list - left 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users size={18} className="text-[var(--color-brand)]" />
                Applicants ({applications?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!applications || applications.length === 0 ? (
                <div className="py-16 text-center text-[var(--color-muted-foreground)] space-y-2">
                  <Users size={32} className="mx-auto text-[var(--color-muted-foreground)]/30 mb-2" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-[var(--color-foreground)]">No applications yet</p>
                  <p className="text-xs">Once candidates apply, they will appear here with AI CV analysis.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table w-full text-left">
                    <thead className="bg-[var(--color-muted)]/50 text-xs font-semibold text-[var(--color-muted-foreground)] uppercase">
                      <tr>
                        <th className="px-5 py-3">Candidate</th>
                        <th className="px-5 py-3">CV Fit</th>
                        <th className="px-5 py-3">Applied</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {applications.map((app: any) => {
                        const statusCfg = getStatusConfig(app.status);
                        const fitScore = app.cv_analysis?.[0]?.job_fit_score ?? app.cv_analysis?.job_fit_score;
                        
                        return (
                          <tr key={app.id} className="hover:bg-[var(--color-muted)]/10 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-semibold text-sm text-[var(--color-foreground)]">
                                {app.candidate?.full_name || "Applicant"}
                              </div>
                              <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                                {app.candidate?.email || "No email"}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {fitScore !== undefined ? (
                                <span className={`inline-flex items-center gap-1 text-sm font-bold ${
                                  fitScore >= 80 
                                    ? "text-green-600" 
                                    : fitScore >= 65 
                                    ? "text-amber-600" 
                                    : "text-red-500"
                                }`}>
                                  {fitScore}%
                                </span>
                              ) : (
                                <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-xs text-[var(--color-muted-foreground)]">
                              {formatDate(app.applied_at)}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                                {statusCfg.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <Button asChild size="sm" variant="ghost">
                                <Link href={`/recruiter/applications/${app.id}`}>
                                  Review
                                </Link>
                              </Button>
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

        {/* Job details panel - right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-[var(--color-border)]">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div className="flex gap-3">
                <Briefcase size={16} className="text-[var(--color-muted-foreground)] mt-0.5" />
                <div>
                  <strong className="block text-[var(--color-foreground)]">Salary Range</strong>
                  <span className="text-[var(--color-muted-foreground)]">
                    {job.salary_min && job.salary_max
                      ? `₦${job.salary_min.toLocaleString()} - ₦${job.salary_max.toLocaleString()}`
                      : "Not specified"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Calendar size={16} className="text-[var(--color-muted-foreground)] mt-0.5" />
                <div>
                  <strong className="block text-[var(--color-foreground)]">Application Deadline</strong>
                  <span className="text-[var(--color-muted-foreground)]">
                    {job.application_deadline
                      ? formatDate(job.application_deadline)
                      : "No deadline"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <FileText size={16} className="text-[var(--color-muted-foreground)] mt-0.5" />
                <div>
                  <strong className="block text-[var(--color-foreground)]">Job Status</strong>
                  <span className="capitalize text-[var(--color-muted-foreground)]">
                    {job.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Skills Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {job.skills_required && job.skills_required.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {job.skills_required.map((skill: string) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded bg-[var(--color-muted)] text-[var(--color-foreground)] text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--color-muted-foreground)]">No specific skills listed.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
