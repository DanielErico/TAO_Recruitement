import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, getStatusConfig, getScoreBg, getInitials } from "@/lib/utils";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Link2,
  Globe,
  FileText,
  Download,
  Calendar,
  Briefcase,
  Star,
  MessageSquare,
  ExternalLink,
  CheckCircle,
  User,
} from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", id)
    .single();
  return { title: data?.full_name ? `${data.full_name} — Candidate Profile` : "Candidate Profile" };
}

export default async function RecruiterCandidateProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: candidateId } = await params;

  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  if (!role) redirect("/login");
  if (!["recruiter", "admin"].includes(role)) redirect("/candidate");

  const supabase = createAdminClient();

  // Parallel data fetching
  const [userProfileRes, candidateProfileRes, applicationsRes, interviewsRes, evaluationsRes] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("id, full_name, email, created_at")
        .eq("id", candidateId)
        .single(),
      supabase
        .from("candidate_profiles")
        .select("*")
        .eq("user_id", candidateId)
        .maybeSingle(),
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
          ),
          cv_analysis:cv_analyses (
            job_fit_score,
            recommendation
          )
        `)
        .eq("candidate_id", candidateId)
        .order("applied_at", { ascending: false }),
      supabase
        .from("interviews")
        .select("id, status, created_at")
        .eq("candidate_id", candidateId),
      supabase
        .from("evaluations")
        .select("overall_score, recommendation, strengths, areas_for_improvement")
        .eq("candidate_id", candidateId),
    ]);

  if (userProfileRes.error || !userProfileRes.data) {
    notFound();
  }

  const userProfile = userProfileRes.data;
  const candidateProfile = candidateProfileRes.data;
  const applications = applicationsRes.data || [];
  const interviews = interviewsRes.data || [];
  const evaluations = evaluationsRes.data || [];

  const avgScore =
    evaluations.length > 0
      ? Math.round(
          evaluations.reduce((acc, e) => acc + (e.overall_score || 0), 0) / evaluations.length
        )
      : null;

  const completedInterviews = interviews.filter((i) => i.status === "completed").length;
  const initials = getInitials(userProfile.full_name || "C A");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Nav */}
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-2 h-8 text-[var(--color-muted-foreground)] -ml-2">
          <Link href="/recruiter/candidates">
            <ArrowLeft size={14} />
            Back to Candidates
          </Link>
        </Button>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 text-[var(--color-brand)]"
              style={{ background: "var(--color-brand-light)" }}
            >
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-[var(--color-foreground)]">
                    {userProfile.full_name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                    <span className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
                      <Mail size={13} />
                      {userProfile.email}
                    </span>
                    {candidateProfile?.location && (
                      <span className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
                        <MapPin size={13} />
                        {candidateProfile.location}
                      </span>
                    )}
                    {candidateProfile?.phone && (
                      <span className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
                        <Phone size={13} />
                        {candidateProfile.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                      <Calendar size={12} />
                      Joined {formatDate(userProfile.created_at)}
                    </span>
                  </div>
                </div>

                {/* Stat pills */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                    <Briefcase size={12} />
                    {applications.length} {applications.length === 1 ? "Application" : "Applications"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                    <MessageSquare size={12} />
                    {completedInterviews} Interviews
                  </span>
                  {avgScore !== null && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getScoreBg(avgScore)}`}>
                      <Star size={12} />
                      Avg Score: {avgScore}%
                    </span>
                  )}
                </div>
              </div>

              {/* Social links */}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {candidateProfile?.linkedin_url && (
                  <Link
                    href={candidateProfile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--color-brand)] hover:underline font-medium"
                  >
                    <Link2 size={13} />
                    LinkedIn
                    <ExternalLink size={10} />
                  </Link>
                )}
                {candidateProfile?.portfolio_url && (
                  <Link
                    href={candidateProfile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--color-brand)] hover:underline font-medium"
                  >
                    <Globe size={13} />
                    Portfolio
                    <ExternalLink size={10} />
                  </Link>
                )}
                {candidateProfile?.resume_url && (
                  <a
                    href={candidateProfile.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--color-brand)] hover:underline font-medium"
                  >
                    <Download size={13} />
                    Download Resume
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio */}
          {candidateProfile?.bio && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User size={16} className="text-[var(--color-brand)]" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--color-foreground)] leading-relaxed whitespace-pre-wrap">
                  {candidateProfile.bio}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Applications History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Briefcase size={16} className="text-[var(--color-brand)]" />
                Application History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {applications.length === 0 ? (
                <div className="py-10 text-center text-sm text-[var(--color-muted-foreground)] space-y-1">
                  <Briefcase size={28} className="mx-auto opacity-20 mb-2" strokeWidth={1.5} />
                  <p className="font-medium text-[var(--color-foreground)]">No applications yet</p>
                  <p className="text-xs">This candidate hasn't applied to any roles.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {applications.map((app: any) => {
                    const statusCfg = getStatusConfig(app.status);
                    const fitScore = app.cv_analysis?.job_fit_score;
                    return (
                      <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 gap-3 hover:bg-[var(--color-muted)]/10 transition-colors">
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-foreground)] truncate">
                            {app.job?.title || "Unknown Role"}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--color-muted-foreground)]">
                            <span>{app.job?.department?.name || "Other"}</span>
                            {app.job?.location && <><span>•</span><span>{app.job.location}</span></>}
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Calendar size={11} />
                              Applied {formatDate(app.applied_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          {fitScore != null && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getScoreBg(fitScore)}`}>
                              CV Fit: {fitScore}%
                            </span>
                          )}
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                            {statusCfg.label}
                          </span>
                          <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            <Link href={`/recruiter/applications/${app.id}`}>
                              <FileText size={12} />
                              Review
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evaluations */}
          {evaluations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Star size={16} className="text-[var(--color-brand)]" />
                  AI Evaluations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {evaluations.map((evaluation, i) => {
                  const recCfg = getStatusConfig(evaluation.recommendation || "");
                  return (
                    <div key={i} className="p-4 rounded-xl border border-[var(--color-border)] space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-sm font-semibold text-[var(--color-foreground)]">
                            Evaluation #{i + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {evaluation.overall_score != null && (
                            <span className={`text-sm font-bold px-2.5 py-0.5 rounded ${getScoreBg(evaluation.overall_score)}`}>
                              {evaluation.overall_score}%
                            </span>
                          )}
                          {evaluation.recommendation && (
                            <span className={`text-xs px-2.5 py-0.5 rounded-full ${recCfg.className}`}>
                              {recCfg.label}
                            </span>
                          )}
                        </div>
                      </div>
                      {evaluation.strengths && evaluation.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-[var(--color-foreground)] mb-1.5">Strengths</p>
                          <ul className="space-y-1">
                            {(evaluation.strengths as string[]).slice(0, 3).map((s, j) => (
                              <li key={j} className="flex items-start gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                                <CheckCircle size={11} className="text-emerald-500 mt-0.5 shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {evaluation.areas_for_improvement && evaluation.areas_for_improvement.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-[var(--color-foreground)] mb-1.5">Areas to Improve</p>
                          <ul className="space-y-1">
                            {(evaluation.areas_for_improvement as string[]).slice(0, 3).map((a, j) => (
                              <li key={j} className="text-xs text-[var(--color-muted-foreground)] pl-3.5">
                                • {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Skills */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CheckCircle size={16} className="text-[var(--color-brand)]" />
                Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidateProfile?.skills && candidateProfile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {candidateProfile.skills.map((skill: string) => (
                    <span
                      key={skill}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[var(--color-brand)]/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--color-muted-foreground)] italic">No skills listed</p>
              )}
            </CardContent>
          </Card>

          {/* Resume */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText size={16} className="text-[var(--color-brand)]" />
                Resume / CV
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidateProfile?.resume_url ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20">
                    <div className="p-2 rounded bg-[var(--color-brand)] text-white shrink-0">
                      <FileText size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[var(--color-foreground)] truncate">
                        {candidateProfile.resume_name || "Resume"}
                      </p>
                      <p className="text-[10px] text-[var(--color-muted-foreground)]">Uploaded CV</p>
                    </div>
                  </div>
                  <a
                    href={candidateProfile.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full"
                  >
                    <Button variant="outline" size="sm" className="w-full gap-1.5 h-8 text-xs">
                      <Download size={13} />
                      Download Resume
                    </Button>
                  </a>
                </div>
              ) : (
                <p className="text-xs text-[var(--color-muted-foreground)] italic">No resume uploaded</p>
              )}
            </CardContent>
          </Card>

          {/* Interview Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MessageSquare size={16} className="text-[var(--color-brand)]" />
                Interviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted-foreground)]">Total</span>
                <span className="font-semibold text-[var(--color-foreground)]">{interviews.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted-foreground)]">Completed</span>
                <span className="font-semibold text-emerald-600">{completedInterviews}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted-foreground)]">Pending</span>
                <span className="font-semibold text-amber-600">
                  {interviews.filter((i) => i.status === "pending" || i.status === "in_progress").length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
